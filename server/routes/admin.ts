import { Router } from "express";
import { storage } from "../storage";
import { requireAdmin } from "../middleware/admin";

const router = Router();

// Protect all admin routes
router.use(requireAdmin);

// Get system statistics
router.get("/stats", async (req, res) => {
  const users = await storage.getAllUsers();
  const items = await storage.getAllItems();
  
  const stats = {
    totalUsers: users.length,
    totalItems: items.length,
    itemsByStatus: {
      LOST: items.filter(i => i.status === "LOST").length,
      FOUND: items.filter(i => i.status === "FOUND").length,
      CLAIMED: items.filter(i => i.status === "CLAIMED").length,
      RETURNED: items.filter(i => i.status === "RETURNED").length,
    },
    itemsByCategory: {
      DOCUMENTS: items.filter(i => i.category === "DOCUMENTS").length,
      ELECTRONICS: items.filter(i => i.category === "ELECTRONICS").length,
      CLOTHING: items.filter(i => i.category === "CLOTHING").length,
      ACCESSORIES: items.filter(i => i.category === "ACCESSORIES").length,
      OTHER: items.filter(i => i.category === "OTHER").length,
    },
    unmoderatedItems: items.filter(i => !i.moderated).length,
  };

  res.json(stats);
});

// Get all users
router.get("/users", async (req, res) => {
  const users = await storage.getAllUsers();
  res.json(users);
});

// Update user (e.g., make admin)
router.patch("/users/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const user = await storage.updateUser(id, req.body);
  res.json(user);
});

// Get activity logs
router.get("/activity-logs", async (req, res) => {
  const logs = await storage.getActivityLogs();
  res.json(logs);
});

// Get unmoderated items
router.get("/moderation", async (req, res) => {
  const items = await storage.getUnmoderatedItems();
  res.json(items);
});

// Moderate an item
router.post("/moderation/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const item = await storage.moderateItem(id, req.user.id);
  res.json(item);
});

export const adminRouter = router;
