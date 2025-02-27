import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import multer from "multer";
import path from "path";
import express from 'express';
import fs from 'fs';
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User as SelectUser } from "@shared/schema";

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

// Ensure upload directory exists
const uploadDir = path.join(process.cwd(), "attached_assets");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const diskStorage = multer.diskStorage({
  destination: uploadDir,
  filename: (_req, file, cb) => {
    cb(null, `image_${Date.now()}${path.extname(file.originalname)}`);
  },
});

const upload = multer({ 
  storage: diskStorage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (_req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  }
});

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

export function setupAuth(app: Express) {
  console.log('Setting up authentication...');

  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET!,
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  // Serve uploaded files statically
  app.use("/uploads", express.static(uploadDir));

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        console.log(`Attempting login for user: ${username}`);
        const user = await storage.getUserByUsername(username);

        if (!user) {
          console.log(`User not found: ${username}`);
          return done(null, false);
        }

        const isValidPassword = await comparePasswords(password, user.password);
        console.log(`Password validation result: ${isValidPassword}`);

        if (!isValidPassword) {
          return done(null, false);
        }
        return done(null, user);
      } catch (err) {
        console.error('Login error:', err);
        return done(err);
      }
    }),
  );

  passport.serializeUser((user, done) => {
    console.log(`Serializing user: ${user.id}`);
    done(null, user.id);
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      console.log(`Deserializing user: ${id}`);
      const user = await storage.getUser(id);
      if (!user) {
        console.log(`User not found during deserialization: ${id}`);
        return done(null, false);
      }
      done(null, user);
    } catch (err) {
      console.error('Deserialization error:', err);
      done(err);
    }
  });

  // Routes
  app.post("/api/register", async (req, res, next) => {
    console.log('Registration attempt:', req.body.username);
    const existingUser = await storage.getUserByUsername(req.body.username);
    if (existingUser) {
      console.log(`Registration failed: Username ${req.body.username} already exists`);
      return res.status(400).json({ error: "Username already exists" });
    }

    try {
      const hashedPassword = await hashPassword(req.body.password);
      const user = await storage.createUser({
        ...req.body,
        password: hashedPassword,
      });

      console.log(`User registered successfully: ${user.id}`);
      req.login(user, (err) => {
        if (err) return next(err);
        res.status(201).json(user);
      });
    } catch (error) {
      console.error('Error during registration:', error);
      res.status(500).json({ error: "Failed to register user" });
    }
  });

  app.post("/api/login", (req, res, next) => {
    console.log('Login attempt:', req.body.username);
    passport.authenticate("local", (err, user, info) => {
      if (err) {
        console.error('Login error:', err);
        return next(err);
      }
      if (!user) {
        console.log('Login failed: Invalid credentials');
        return res.status(401).json({ error: "Invalid credentials" });
      }
      req.logIn(user, (err) => {
        if (err) {
          console.error('Session error:', err);
          return next(err);
        }
        console.log(`Login successful: ${user.id}`);
        res.json(user);
      });
    })(req, res, next);
  });

  app.post("/api/logout", (req, res, next) => {
    const userId = req.user?.id;
    console.log(`Logout attempt for user: ${userId}`);
    req.logout((err) => {
      if (err) {
        console.error('Logout error:', err);
        return next(err);
      }
      console.log(`Logout successful for user: ${userId}`);
      res.sendStatus(200);
    });
  });

  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) {
      console.log('Unauthorized access attempt to /api/user');
      return res.sendStatus(401);
    }
    console.log(`User data requested for: ${req.user.id}`);
    res.json(req.user);
  });

  app.post("/api/user/profile-picture", upload.single('profilePicture'), async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    try {
      const user = await storage.updateUser(req.user.id, {
        profilePicture: `/uploads/${req.file.filename}`
      });
      res.json(user);
    } catch (error) {
      console.error('Error updating profile picture:', error);
      res.status(500).json({ error: "Failed to update profile picture" });
    }
  });

  app.patch("/api/user/profile", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const { username, currentPassword, newPassword } = req.body;
      const user = await storage.getUser(req.user.id);

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Verify current password
      if (!(await comparePasswords(currentPassword, user.password))) {
        return res.status(400).json({ error: "Current password is incorrect" });
      }

      // Update user data
      const updates: Partial<SelectUser> = { username };
      if (newPassword) {
        updates.password = await hashPassword(newPassword);
      }

      const updatedUser = await storage.updateUser(user.id, updates);
      res.json(updatedUser);
    } catch (error) {
      console.error('Error updating profile:', error);
      res.status(500).json({ error: "Failed to update profile" });
    }
  });
  console.log('Authentication setup completed');
}