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
    const returnRate = await storage.getItemReturnRate();

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
      },
      returnRate
    };

    res.json(stats);
  } catch (error) {
    console.error('Error getting stats:', error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get system metrics
router.get("/system-metrics", async (req, res) => {
  try {
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - 24 * 60 * 60 * 1000); // Last 24 hours

    const metrics = await storage.getSystemMetrics("PERFORMANCE", startDate, endDate);
    const latestMetric = metrics[metrics.length - 1];

    // Calculate error rate from API usage
    const apiStats = await storage.getApiUsageStats(startDate, endDate);
    const errorRequests = apiStats.filter(stat => stat.statusCode >= 400).length;
    const errorRate = apiStats.length > 0 ? (errorRequests / apiStats.length) * 100 : 0;

    res.json({
      apiResponseTime: latestMetric?.value.responseTime || 0,
      errorRate,
      activeUsers: latestMetric?.value.activeUsers || 0,
      cpuUsage: latestMetric?.value.cpuUsage || 0,
      memoryUsage: latestMetric?.value.memoryUsage || 0,
    });
  } catch (error) {
    console.error('Error getting system metrics:', error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get user activity statistics
router.get("/user-activity", async (req, res) => {
  try {
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - 24 * 60 * 60 * 1000); // Last 24 hours

    const activities = await storage.getApiUsageStats(startDate, endDate);
    const logins = activities.filter(a => a.endpoint === "/api/login" && a.statusCode === 200).length;
    const moderationActions = activities.filter(a => 
      a.endpoint.startsWith("/api/admin/moderation") && 
      a.statusCode === 200
    ).length;
    const itemReports = activities.filter(a => 
      (a.endpoint === "/api/documents" || a.endpoint === "/api/devices") && 
      a.method === "POST" &&
      a.statusCode === 201
    ).length;

    res.json({
      recentLogins: logins,
      activeModeration: moderationActions,
      itemsReported: itemReports,
    });
  } catch (error) {
    console.error('Error getting user activity:', error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get API usage statistics
router.get("/api-usage", async (req, res) => {
  try {
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - 24 * 60 * 60 * 1000); // Last 24 hours

    const apiStats = await storage.getApiUsageStats(startDate, endDate);

    // Calculate average response time
    const totalResponseTime = apiStats.reduce((sum, stat) => sum + stat.responseTime, 0);
    const averageResponseTime = apiStats.length > 0 ? totalResponseTime / apiStats.length : 0;

    // Calculate error rate
    const errorRequests = apiStats.filter(stat => stat.statusCode >= 400).length;
    const errorRate = apiStats.length > 0 ? (errorRequests / apiStats.length) * 100 : 0;

    // Get top endpoints
    const endpointCounts = apiStats.reduce((acc, stat) => {
      acc[stat.endpoint] = (acc[stat.endpoint] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const topEndpoints = Object.entries(endpointCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([endpoint, count]) => ({ endpoint, count }));

    res.json({
      totalRequests: apiStats.length,
      averageResponseTime,
      errorRate,
      topEndpoints,
    });
  } catch (error) {
    console.error('Error getting API usage stats:', error);
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