import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { insertDocumentSchema, insertDeviceSchema } from "@shared/schema";
import { adminRouter } from "./routes/admin";
import { setupWebSocket, notificationServer } from "./websocket";
import { categorizeItem, recordMLMetrics } from "./services/categorization";

export async function registerRoutes(app: Express): Promise<Server> {
  setupAuth(app);

  // Mount admin routes
  app.use("/api/admin", adminRouter);

  // Documents routes
  app.get("/api/documents", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    const query = req.query.q as string;
    if (query) {
      const documents = await storage.searchDocuments(query);
      return res.json(documents);
    }

    const documents = await storage.getAllDocuments();
    res.json(documents);
  });

  app.post("/api/documents", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    const parsed = insertDocumentSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json(parsed.error);
    }

    try {
      // Start ML processing timer
      const startTime = Date.now();

      // Get ML categorization
      const { suggestedCategories, categoryFeatures } = await categorizeItem(
        parsed.data.title,
        parsed.data.description
      );

      // Create document with ML categorization data
      const document = await storage.createDocument({
        ...parsed.data,
        suggestedCategories,
        categoryFeatures,
        mlProcessedAt: new Date(),
      }, req.user.id);

      // Record ML metrics
      const mlMetrics = recordMLMetrics(startTime, suggestedCategories);
      await storage.recordSystemMetric({
        metricType: "ML_PROCESSING",
        value: {
          type: "ML_PROCESSING",
          metrics: mlMetrics,
        },
      });

      // Send notification to admins
      notificationServer.broadcastAdminNotification({
        type: "ADMIN_ALERT",
        message: `New ${document.status.toLowerCase()} document reported`,
        data: { document },
      });

      res.status(201).json(document);
    } catch (error) {
      console.error('Error processing document:', error);
      res.status(500).json({ error: "Error processing document" });
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

  app.post("/api/devices", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    const parsed = insertDeviceSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json(parsed.error);
    }

    try {
      // Start ML processing timer
      const startTime = Date.now();

      // Get ML categorization
      const { suggestedCategories, categoryFeatures } = await categorizeItem(
        `${parsed.data.brandModel} ${parsed.data.serialNumber}`,
        parsed.data.description
      );

      // Create device with ML categorization data
      const device = await storage.createDevice({
        ...parsed.data,
        suggestedCategories,
        categoryFeatures,
        mlProcessedAt: new Date(),
      }, req.user.id);

      // Record ML metrics
      const mlMetrics = recordMLMetrics(startTime, suggestedCategories);
      await storage.recordSystemMetric({
        metricType: "ML_PROCESSING",
        value: {
          type: "ML_PROCESSING",
          metrics: mlMetrics,
        },
      });

      // Send notification to admins
      notificationServer.broadcastAdminNotification({
        type: "ADMIN_ALERT",
        message: `New ${device.status.toLowerCase()} device reported`,
        data: { device },
      });

      res.status(201).json(device);
    } catch (error) {
      console.error('Error processing device:', error);
      res.status(500).json({ error: "Error processing device" });
    }
  });

  app.patch("/api/devices/:id/status", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    const id = parseInt(req.params.id);
    const device = await storage.getDevice(id);

    if (!device) {
      return res.status(404).send("Device not found");
    }

    if (device.reportedBy !== req.user.id) {
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

    res.json(updatedDevice);
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

  const httpServer = createServer(app);

  // Setup WebSocket server
  setupWebSocket(httpServer);

  return httpServer;
}