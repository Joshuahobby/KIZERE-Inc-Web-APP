import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertDocumentSchema, insertDeviceSchema } from "@shared/schema";
import { adminRouter } from "./routes/admin";
import { setupWebSocket, notificationServer } from "./websocket";

export async function registerRoutes(app: Express): Promise<Server> {
  // Do not call setupAuth here since it's already called in index.ts

  // Mount admin routes
  app.use("/api/admin", adminRouter);

  // Documents routes
  app.get("/api/documents", async (req, res) => {
    console.log("GET /api/documents - Auth status:", req.isAuthenticated()); //Added debug log
    if (!req.isAuthenticated()) return res.sendStatus(401);

    const query = req.query.q as string;
    if (query) {
      console.log("GET /api/documents - Search query:", query); //Added debug log
      const documents = await storage.searchDocuments(query);
      return res.json(documents);
    }

    console.log("GET /api/documents - Getting all documents"); //Added debug log
    const documents = await storage.getAllDocuments();
    res.json(documents);
  });

  app.post("/api/documents", async (req, res) => {
    console.log("POST /api/documents - Auth status:", req.isAuthenticated()); //Added debug log
    if (!req.isAuthenticated()) return res.sendStatus(401);

    const parsed = insertDocumentSchema.safeParse(req.body);
    if (!parsed.success) {
      console.error("POST /api/documents - Schema validation failed:", parsed.error); //Added debug log
      return res.status(400).json(parsed.error);
    }

    const document = await storage.createDocument(parsed.data, req.user.id);

    // Send notification to admins
    notificationServer.broadcastAdminNotification({
      type: "ADMIN_ALERT",
      message: `New ${document.status.toLowerCase()} document reported`,
      data: { document },
    });

    console.log("POST /api/documents - Document created:", document); //Added debug log
    res.status(201).json(document);
  });

  app.patch("/api/documents/:id/status", async (req, res) => {
    console.log("PATCH /api/documents/:id/status - Auth status:", req.isAuthenticated()); //Added debug log
    if (!req.isAuthenticated()) return res.sendStatus(401);

    const id = parseInt(req.params.id);
    const document = await storage.getDocument(id);

    if (!document) {
      console.warn("PATCH /api/documents/:id/status - Document not found:", id); //Added debug log
      return res.status(404).send("Document not found");
    }

    if (document.reportedBy !== req.user.id) {
      console.warn("PATCH /api/documents/:id/status - Unauthorized access:", req.user.id, document.reportedBy); //Added debug log
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

    console.log("PATCH /api/documents/:id/status - Document updated:", updatedDocument); //Added debug log
    res.json(updatedDocument);
  });

  // Documents search route
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


  // Devices routes
  app.get("/api/devices", async (req, res) => {
    console.log("GET /api/devices - Auth status:", req.isAuthenticated()); //Added debug log
    if (!req.isAuthenticated()) return res.sendStatus(401);

    const query = req.query.q as string;
    if (query) {
      console.log("GET /api/devices - Search query:", query); //Added debug log
      const devices = await storage.searchDevices(query);
      return res.json(devices);
    }

    console.log("GET /api/devices - Getting all devices"); //Added debug log
    const devices = await storage.getAllDevices();
    res.json(devices);
  });

  app.post("/api/devices", async (req, res) => {
    console.log("POST /api/devices - Auth status:", req.isAuthenticated()); //Added debug log
    if (!req.isAuthenticated()) return res.sendStatus(401);

    const parsed = insertDeviceSchema.safeParse(req.body);
    if (!parsed.success) {
      console.error("POST /api/devices - Schema validation failed:", parsed.error); //Added debug log
      return res.status(400).json(parsed.error);
    }

    const device = await storage.createDevice(parsed.data, req.user.id);

    // Send notification to admins
    notificationServer.broadcastAdminNotification({
      type: "ADMIN_ALERT",
      message: `New ${device.status.toLowerCase()} device reported`,
      data: { device },
    });

    console.log("POST /api/devices - Device created:", device); //Added debug log
    res.status(201).json(device);
  });

  app.patch("/api/devices/:id/status", async (req, res) => {
    console.log("PATCH /api/devices/:id/status - Auth status:", req.isAuthenticated()); //Added debug log
    if (!req.isAuthenticated()) return res.sendStatus(401);

    const id = parseInt(req.params.id);
    const device = await storage.getDevice(id);

    if (!device) {
      console.warn("PATCH /api/devices/:id/status - Device not found:", id); //Added debug log
      return res.status(404).send("Device not found");
    }

    if (device.reportedBy !== req.user.id) {
      console.warn("PATCH /api/devices/:id/status - Unauthorized access:", req.user.id, device.reportedBy); //Added debug log
      return res.status(403).send("Not authorized");
    }

    const updatedDevice = await storage.updateDevice(id, {
      status: req.body.status
    });

    // Send notification to the device owner
    notificationServer.sendNotification(device.reportedBy, {
      type: "ITEM_STATUS_CHANGE",
      message: `Device status changed to ${updatedDevice.status}`,
      data: { device: updatedDevice },
    });

    console.log("PATCH /api/devices/:id/status - Device updated:", updatedDevice); //Added debug log
    res.json(updatedDevice);
  });

  // Devices search route
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

  const httpServer = createServer(app);

  // Setup WebSocket server
  setupWebSocket(httpServer);

  return httpServer;
}