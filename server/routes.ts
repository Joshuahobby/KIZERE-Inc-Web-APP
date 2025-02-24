import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { insertItemSchema } from "@shared/schema";
import { adminRouter } from "./routes/admin";
import { setupWebSocket, notificationServer } from "./websocket";

export async function registerRoutes(app: Express): Promise<Server> {
  setupAuth(app);

  // Mount admin routes
  app.use("/api/admin", adminRouter);

  app.get("/api/items", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    const query = req.query.q as string;
    if (query) {
      const items = await storage.searchItems(query);
      return res.json(items);
    }

    const items = await storage.getUserItems(req.user.id);
    res.json(items);
  });

  app.post("/api/items", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    const parsed = insertItemSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json(parsed.error);
    }

    const item = await storage.createItem({
      ...parsed.data,
      reportedBy: req.user.id,
    });

    // Log the activity
    await storage.logActivity({
      userId: req.user.id,
      action: "ITEM_REPORT",
      details: { itemId: item.id, status: item.status },
    });

    // Send notification to admins
    notificationServer.broadcastAdminNotification({
      type: "ADMIN_ALERT",
      message: `New ${item.status.toLowerCase()} item reported: ${item.name}`,
      data: { item },
    });

    res.status(201).json(item);
  });

  app.patch("/api/items/:id/status", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    const id = parseInt(req.params.id);
    const item = await storage.getItem(id);

    if (!item) {
      return res.status(404).send("Item not found");
    }

    if (item.reportedBy !== req.user.id) {
      return res.status(403).send("Not authorized");
    }

    const updatedItem = await storage.updateItemStatus(id, req.body.status);

    // Log the activity
    await storage.logActivity({
      userId: req.user.id,
      action: "ITEM_UPDATE",
      details: { itemId: id, oldStatus: item.status, newStatus: updatedItem.status },
    });

    // Send notification to the item owner
    notificationServer.sendNotification(item.reportedBy, {
      type: "ITEM_STATUS_CHANGE",
      message: `Item "${item.name}" status changed to ${updatedItem.status}`,
      data: { item: updatedItem },
    });

    res.json(updatedItem);
  });

  const httpServer = createServer(app);

  // Setup WebSocket server
  setupWebSocket(httpServer);

  return httpServer;
}