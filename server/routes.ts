import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { insertItemSchema } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  setupAuth(app);

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
    res.json(updatedItem);
  });

  const httpServer = createServer(app);
  return httpServer;
}
