import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { insertDocumentSchema, insertDeviceSchema, insertRegisteredItemSchema } from "@shared/schema";
import { adminRouter } from "./routes/admin";
import { setupWebSocket, notificationServer } from "./websocket";
import { categorizeItem } from "./services/categorization";
import { SocialShareService } from './services/social-share';
import multer from "multer";
import { nanoid } from "nanoid";
import path from "path";
import fs from 'fs';
import express from 'express'; //Import express for static file serving

// Ensure uploads directory exists
const uploadDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Configure multer for file uploads
  const uploadStorage = multer.diskStorage({
    destination: uploadDir,
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
  });

  const upload = multer({
    storage: uploadStorage,
    limits: {
      fileSize: 5 * 1024 * 1024, // 5MB limit
    },
    fileFilter: (req, file, cb) => {
      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'];
      if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error('Invalid file type. Only JPG, PNG, GIF and PDF files are allowed.'));
      }
    }
  });

  // Serve uploaded files statically
  app.use('/uploads', express.static(uploadDir));

  // File upload endpoint
  app.post("/api/upload", upload.single("file"), (req, res) => {
    try {
      console.log('File upload request received');

      if (!req.file) {
        console.error('No file uploaded');
        return res.status(400).json({ error: "No file uploaded" });
      }

      console.log('File uploaded successfully:', req.file.filename);
      const fileUrl = `/uploads/${req.file.filename}`;
      res.json({ url: fileUrl });
    } catch (error) {
      console.error('File upload error:', error);
      res.status(500).json({
        error: "Failed to upload file",
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  setupAuth(app);
  app.use("/api/admin", adminRouter);

  // Register item route with multiple file upload support
  app.post("/api/register-item", upload.fields([
    { name: 'pictures', maxCount: 10 },
    { name: 'proofOfOwnership', maxCount: 1 }
  ]), async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        console.log('Unauthorized registration attempt');
        return res.status(401).json({ error: "Not authenticated" });
      }

      console.log('Registration request received:', {
        body: req.body,
        files: req.files ? Object.keys(req.files) : 'no files'
      });

      // Validate file uploads
      const picturesFiles = (req.files as { [fieldname: string]: Express.Multer.File[] })['pictures'] || [];
      const proofOfOwnershipFile = (req.files as { [fieldname: string]: Express.Multer.File[] })['proofOfOwnership']?.[0];

      if (picturesFiles.length === 0) {
        return res.status(400).json({ error: "At least one picture is required" });
      }

      const pictures = picturesFiles.map(file => `/uploads/${file.filename}`);
      const proofOfOwnership = proofOfOwnershipFile ? `/uploads/${proofOfOwnershipFile.filename}` : undefined;

      // Parse metadata if provided
      let metadata = {};
      if (req.body.metadata) {
        try {
          metadata = JSON.parse(req.body.metadata);
        } catch (error) {
          console.error('Error parsing metadata:', error);
          return res.status(400).json({ error: "Invalid metadata format" });
        }
      }

      // Create registration data
      const registrationData = {
        itemType: req.body.itemType,
        officialId: req.body.officialId,
        pictures,
        proofOfOwnership,
        metadata,
        ownerId: req.user.id
      };

      console.log('Attempting to create registered item:', registrationData);

      // Validate registration data
      const parsed = insertRegisteredItemSchema.safeParse(registrationData);
      if (!parsed.success) {
        console.error('Registration validation failed:', parsed.error);
        return res.status(400).json({ error: parsed.error.errors });
      }

      // Create registered item
      const registeredItem = await storage.createRegisteredItem({
        ...parsed.data,
        ownerId: registrationData.ownerId
      });

      console.log('Item registered successfully:', registeredItem);

      res.status(201).json(registeredItem);
    } catch (error) {
      console.error('Error in item registration:', error);
      res.status(500).json({
        error: "Failed to register item",
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Document creation route
  app.post("/api/documents", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        console.log('Unauthorized document creation attempt');
        return res.sendStatus(401);
      }

      console.log('Document creation request received:', req.body);

      const parsed = insertDocumentSchema.safeParse(req.body);
      if (!parsed.success) {
        console.error('Document validation failed:', parsed.error);
        return res.status(400).json({ error: parsed.error.errors });
      }

      const uniqueId = nanoid();
      const { suggestedCategories, categoryFeatures } = await categorizeItem(
        parsed.data.title,
        parsed.data.description
      );

      console.log('ML Categorization results:', { suggestedCategories, categoryFeatures });

      const documentData = {
        ...parsed.data,
        uniqueId,
        suggestedCategories,
        categoryFeatures,
        mlProcessedAt: new Date().toISOString(),
        socialShares: [],
        lastSharedAt: null,
        totalShares: 0,
        moderated: false,
        moderatedBy: null,
        moderatedAt: null,
        qrCode: null,
        qrCodeGeneratedAt: null
      };

      console.log('Creating document with data:', documentData);

      const document = await storage.createDocument(documentData, req.user.id);
      console.log('Document created successfully:', document);

      notificationServer.broadcastAdminNotification({
        type: "ADMIN_ALERT",
        message: `New ${document.status.toLowerCase()} document reported`,
        data: { document },
      });

      res.status(201).json(document);
    } catch (error) {
      console.error('Error in document creation:', error);
      res.status(500).json({
        error: "Failed to create document",
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Documents routes
  app.get("/api/documents", async (req, res) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);

      const query = req.query.q as string;
      if (query) {
        const documents = await storage.searchDocuments(query);
        return res.json(documents);
      }

      const documents = await storage.getAllDocuments();
      res.json(documents);
    } catch (error) {
      console.error('Error fetching documents:', error);
      res.status(500).json({ error: "Failed to fetch documents" });
    }
  });

  app.patch("/api/documents/:id/status", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    const id = parseInt(req.params.id);
    const document = await storage.getDocument(id);

    if (!document) {
      return res.status(404).send("Document not found");
    }

    if (document.reportedBy !== req.user.id) {
      return res.status(403).send("Not authorized");
    }

    const updatedDocument = await storage.updateDocument(id, {
      status: req.body.status
    });

    // Send notification to the document owner
    notificationServer.sendNotification(document.reportedBy, {
      type: "ITEM_STATUS_CHANGE",
      message: `Document status changed to ${updatedDocument.status}`,
      data: { document: updatedDocument },
    });

    res.json(updatedDocument);
  });

  // Devices routes
  app.get("/api/devices", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    const query = req.query.q as string;
    if (query) {
      const devices = await storage.searchDevices(query);
      return res.json(devices);
    }

    const devices = await storage.getAllDevices();
    res.json(devices);
  });

  // Device creation route
  app.post("/api/devices", async (req, res) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);

      console.log('Received device creation request:', req.body);

      const parsed = insertDeviceSchema.safeParse(req.body);
      if (!parsed.success) {
        console.error('Device validation failed:', parsed.error);
        return res.status(400).json({ error: parsed.error.errors });
      }

      // Generate unique ID first
      const uniqueId = nanoid();
      console.log('Generated uniqueId:', uniqueId);

      // Get ML categorization
      const { suggestedCategories, categoryFeatures } = await categorizeItem(
        `${parsed.data.brandModel} ${parsed.data.serialNumber}`,
        parsed.data.description
      );

      console.log('ML Categorization results:', { suggestedCategories, categoryFeatures });

      // Create device with all required fields
      const deviceData = {
        ...parsed.data,
        uniqueId,
        suggestedCategories,
        categoryFeatures,
        mlProcessedAt: new Date().toISOString(),
        socialShares: [],
        lastSharedAt: null,
        totalShares: 0,
        moderated: false,
        moderatedBy: null,
        moderatedAt: null,
        qrCode: null,
        qrCodeGeneratedAt: null
      };

      console.log('Attempting to create device with data:', deviceData);

      const device = await storage.createDevice(deviceData, req.user.id);
      console.log('Device created successfully:', device);

      // Send notification to admins
      notificationServer.broadcastAdminNotification({
        type: "ADMIN_ALERT",
        message: `New ${device.status.toLowerCase()} device reported`,
        data: { device },
      });

      res.status(201).json(device);
    } catch (error) {
      console.error('Error in device creation:', error);
      res.status(500).json({
        error: "Error creating device",
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Search routes
  app.get("/api/documents/search", async (req, res) => {
    try {
      const query = req.query.q as string;
      console.log('Document search request:', query);

      if (!query) {
        return res.json([]);
      }

      const documents = await storage.searchDocuments(query);
      res.json(documents);
    } catch (error) {
      console.error('Error in document search:', error);
      res.status(500).json({ error: "Error searching documents" });
    }
  });

  app.get("/api/devices/search", async (req, res) => {
    try {
      const query = req.query.q as string;
      console.log('Device search request:', query);

      if (!query) {
        return res.json([]);
      }

      const devices = await storage.searchDevices(query);
      res.json(devices);
    } catch (error) {
      console.error('Error in device search:', error);
      res.status(500).json({ error: "Error searching devices" });
    }
  });

  // Social sharing routes
  app.post("/api/documents/:id/share", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    const id = parseInt(req.params.id);
    const document = await storage.getDocument(id);

    if (!document) {
      return res.status(404).send("Document not found");
    }

    const { platform } = req.body;
    const shareUrl = `${process.env.APP_URL}/documents/${document.uniqueId}`;

    const result = await SocialShareService.shareToSocialMedia(
      {
        title: document.title,
        description: document.description,
        url: shareUrl,
        platform,
      },
      'document',
      id
    );

    if (!result.success) {
      return res.status(500).json({ error: result.error });
    }

    res.json({ shareUrl: result.url });
  });

  app.post("/api/devices/:id/share", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    const id = parseInt(req.params.id);
    const device = await storage.getDevice(id);

    if (!device) {
      return res.status(404).send("Device not found");
    }

    const { platform } = req.body;
    const shareUrl = `${process.env.APP_URL}/devices/${device.uniqueId}`;

    const result = await SocialShareService.shareToSocialMedia(
      {
        title: `${device.brandModel} - ${device.category}`,
        description: device.description,
        url: shareUrl,
        platform,
      },
      'device',
      id
    );

    if (!result.success) {
      return res.status(500).json({ error: result.error });
    }

    res.json({ shareUrl: result.url });
  });

  app.get("/api/registered-items", async (req, res) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);

      const items = await storage.getUserRegisteredItems(req.user.id);
      res.json(items);
    } catch (error) {
      console.error('Error fetching registered items:', error);
      res.status(500).json({ error: "Error fetching registered items" });
    }
  });

  app.get("/api/registered-items/search", async (req, res) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);

      const officialId = req.query.officialId as string;
      if (!officialId) {
        return res.status(400).json({ error: "Official ID is required" });
      }

      const item = await storage.getRegisteredItemByOfficialId(officialId);
      res.json(item || null);
    } catch (error) {
      console.error('Error searching registered item:', error);
      res.status(500).json({ error: "Error searching registered item" });
    }
  });


  const httpServer = createServer(app);
  setupWebSocket(httpServer);
  return httpServer;
}