import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { insertDocumentSchema, insertDeviceSchema } from "@shared/schema";
import { adminRouter } from "./routes/admin";
import { setupWebSocket, notificationServer } from "./websocket";
import { categorizeItem, recordMLMetrics } from "./services/categorization";
import { SocialShareService } from './services/social-share';
import { nanoid } from 'nanoid';

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

  // Document creation route
  app.post("/api/documents", async (req, res) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);

      console.log('Received document creation request:', req.body);

      const parsed = insertDocumentSchema.safeParse(req.body);
      if (!parsed.success) {
        console.error('Document validation failed:', parsed.error);
        return res.status(400).json({ error: parsed.error.errors });
      }

      // Generate unique ID first
      const uniqueId = nanoid();
      console.log('Generated uniqueId:', uniqueId);

      // Get ML categorization
      const { suggestedCategories, categoryFeatures } = await categorizeItem(
        parsed.data.title,
        parsed.data.description
      );

      console.log('ML Categorization results:', { suggestedCategories, categoryFeatures });

      // Create document with all required fields
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

      console.log('Attempting to create document with data:', documentData);

      const document = await storage.createDocument(documentData, req.user.id);
      console.log('Document created successfully:', document);

      // Send notification to admins
      notificationServer.broadcastAdminNotification({
        type: "ADMIN_ALERT",
        message: `New ${document.status.toLowerCase()} document reported`,
        data: { document },
      });

      res.status(201).json(document);
    } catch (error) {
      console.error('Error in document creation:', error);
      res.status(500).json({ 
        error: "Error creating document",
        details: error instanceof Error ? error.message : 'Unknown error'
      });
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

  const httpServer = createServer(app);

  // Setup WebSocket server
  setupWebSocket(httpServer);

  return httpServer;
}