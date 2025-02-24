import { Router } from "express";
import { storage } from "../storage";
import { requireAdmin } from "../middleware/admin";
import { insertRoleSchema } from "@shared/schema";

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

// Get unmoderated items
router.get("/moderation", async (req, res) => {
  const items = await storage.getUnmoderatedItems();
  res.json(items);
});

// Moderate an item
router.post("/moderation/:id", async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  const id = parseInt(req.params.id);
  const item = await storage.moderateItem(id, req.user.id);
  res.json(item);
});

export const adminRouter = router;