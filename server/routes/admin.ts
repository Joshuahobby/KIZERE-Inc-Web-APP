import { Router } from "express";
import { storage } from "../storage";
import { requireAdmin } from "../middleware/admin";
import { insertRoleSchema } from "@shared/schema";

const router = Router();

// Protect all admin routes
router.use(requireAdmin);

// Get system statistics
router.get("/stats", async (req, res) => {
  try {
    const users = await storage.getAllUsers();
    const documents = await storage.getAllDocuments();
    const devices = await storage.getAllDevices();

    const stats = {
      totalUsers: users.length,
      documents: {
        total: documents.length,
        byStatus: {
          LOST: documents.filter(d => d.status === "LOST").length,
          FOUND: documents.filter(d => d.status === "FOUND").length,
          REVIEW: documents.filter(d => d.status === "REVIEW").length,
        },
        unmoderated: documents.filter(d => !d.moderated).length,
      },
      devices: {
        total: devices.length,
        byStatus: {
          LOST: devices.filter(d => d.status === "LOST").length,
          FOUND: devices.filter(d => d.status === "FOUND").length,
          REVIEW: devices.filter(d => d.status === "REVIEW").length,
        },
        unmoderated: devices.filter(d => !d.moderated).length,
      }
    };

    res.json(stats);
  } catch (error) {
    console.error('Error getting stats:', error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get all users
router.get("/users", async (req, res) => {
  const users = await storage.getAllUsers();
  res.json(users);
});

// Update user (e.g., make admin or assign role)
router.patch("/users/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const user = await storage.updateUser(id, req.body);
  res.json(user);
});

// Get all roles
router.get("/roles", async (req, res) => {
  const roles = await storage.getAllRoles();
  res.json(roles);
});

// Create new role
router.post("/roles", async (req, res) => {
  try {
    const roleData = insertRoleSchema.parse(req.body);
    const role = await storage.createRole(roleData);
    res.status(201).json(role);
  } catch (error) {
    res.status(400).json({ error: "Invalid role data" });
  }
});

// Update role
router.patch("/roles/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const role = await storage.updateRole(id, req.body);
  res.json(role);
});

// Delete role
router.delete("/roles/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  await storage.deleteRole(id);
  res.sendStatus(204);
});

// Get unmoderated items (both documents and devices)
router.get("/moderation", async (req, res) => {
  try {
    const [documents, devices] = await Promise.all([
      storage.getUnmoderatedDocuments(),
      storage.getUnmoderatedDevices()
    ]);

    res.json({
      documents,
      devices
    });
  } catch (error) {
    console.error('Error getting unmoderated items:', error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Moderate a document
router.post("/moderation/documents/:id", async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const id = parseInt(req.params.id);
    const document = await storage.moderateDocument(id, req.user.id);
    res.json(document);
  } catch (error) {
    console.error('Error moderating document:', error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Moderate a device
router.post("/moderation/devices/:id", async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const id = parseInt(req.params.id);
    const device = await storage.moderateDevice(id, req.user.id);
    res.json(device);
  } catch (error) {
    console.error('Error moderating device:', error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export const adminRouter = router;