import { Router } from "express";
import { storage } from "../storage";
import { requireAdmin } from "../middleware/admin";
import { insertRoleSchema, insertIpAllowlistSchema } from "@shared/schema";
import { authenticator } from "otplib";
import ipRangeCheck from "ip-range-check";
import QRCode from "qrcode";

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

// 2FA setup
router.post("/2fa/setup", async (req, res) => {
  if (!req.user) return res.status(401).json({ error: "Unauthorized" });

  try {
    const secret = authenticator.generateSecret();
    const otpAuthUrl = authenticator.keyuri(req.user.username, "KIZERE Admin", secret);
    const qrCode = await QRCode.toDataURL(otpAuthUrl);
    const backupCodes = Array.from({ length: 10 }, () => authenticator.generateSecret().slice(0, 8));

    await storage.updateUser(req.user.id, {
      twoFactorSecret: secret,
      backupCodes: backupCodes,
    });

    await storage.logSecurityAudit({
      userId: req.user.id,
      actionType: "2FA_SETUP_INITIATED",
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
      success: true,
      details: { timestamp: new Date() },
    });

    res.json({
      qrCode,
      secret,
      backupCodes,
    });
  } catch (error) {
    console.error('Error setting up 2FA:', error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// 2FA verification
router.post("/2fa/verify", async (req, res) => {
  if (!req.user) return res.status(401).json({ error: "Unauthorized" });

  try {
    const { token } = req.body;
    const user = await storage.getUser(req.user.id);
    if (!user?.twoFactorSecret) {
      return res.status(400).json({ error: "2FA not set up" });
    }

    const isValid = authenticator.verify({
      token,
      secret: user.twoFactorSecret,
    });

    if (!isValid) {
      await storage.logSecurityAudit({
        userId: req.user.id,
        actionType: "2FA_VERIFY_FAILED",
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"],
        success: false,
        details: { timestamp: new Date() },
      });
      return res.status(401).json({ error: "Invalid token" });
    }

    await storage.updateUser(req.user.id, {
      twoFactorEnabled: true,
    });

    await storage.logSecurityAudit({
      userId: req.user.id,
      actionType: "2FA_VERIFY_SUCCESS",
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
      success: true,
      details: { timestamp: new Date() },
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Error verifying 2FA:', error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// IP allowlist management
router.get("/ip-allowlist", async (req, res) => {
  try {
    const allowlist = await storage.getIpAllowlist();
    res.json(allowlist);
  } catch (error) {
    console.error('Error getting IP allowlist:', error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/ip-allowlist", async (req, res) => {
  if (!req.user) return res.status(401).json({ error: "Unauthorized" });

  try {
    const ipData = insertIpAllowlistSchema.parse(req.body);
    const entry = await storage.addIpAllowlist({
      ...ipData,
      createdBy: req.user.id,
    });

    await storage.logSecurityAudit({
      userId: req.user.id,
      actionType: "IP_ALLOWLIST_ADD",
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
      success: true,
      details: { ipRange: ipData.ipRange },
    });

    res.status(201).json(entry);
  } catch (error) {
    console.error('Error adding IP to allowlist:', error);
    res.status(400).json({ error: "Invalid IP allowlist data" });
  }
});

// Session management
router.get("/sessions", async (req, res) => {
  if (!req.user) return res.status(401).json({ error: "Unauthorized" });

  try {
    const sessions = await storage.getUserSessions(req.user.id);
    res.json({
      current: req.sessionID,
      sessions,
    });
  } catch (error) {
    console.error('Error getting user sessions:', error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/sessions/:sessionId", async (req, res) => {
  if (!req.user) return res.status(401).json({ error: "Unauthorized" });

  try {
    await storage.terminateSession(req.params.sessionId);

    await storage.logSecurityAudit({
      userId: req.user.id,
      actionType: "SESSION_TERMINATED",
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
      success: true,
      details: { sessionId: req.params.sessionId },
    });

    res.sendStatus(200);
  } catch (error) {
    console.error('Error terminating session:', error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get audit logs
router.get("/audit-logs", async (req, res) => {
  try {
    const logs = await storage.getSecurityAuditLogs();
    res.json(logs);
  } catch (error) {
    console.error('Error getting audit logs:', error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export const adminRouter = router;