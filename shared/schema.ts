import { pgTable, text, serial, timestamp, boolean, json, integer, jsonb, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users table with enhanced security fields
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  profilePicture: text("profile_picture"),
  isAdmin: boolean("is_admin").notNull().default(false),
  roleId: integer("role_id").references(() => roles.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  // 2FA fields
  twoFactorSecret: text("two_factor_secret"),
  twoFactorEnabled: boolean("two_factor_enabled").notNull().default(false),
  backupCodes: json("backup_codes").$type<string[]>(),
  // Security fields
  lastLogin: timestamp("last_login"),
  failedLoginAttempts: integer("failed_login_attempts").notNull().default(0),
  accountLocked: boolean("account_locked").notNull().default(false),
  lockExpiresAt: timestamp("lock_expires_at"),
  passwordChangedAt: timestamp("password_changed_at"),
  forcePasswordChange: boolean("force_password_change").notNull().default(false),
});

// IP Allowlist for admin access
export const ipAllowlist = pgTable("ip_allowlist", {
  id: serial("id").primaryKey(),
  ipRange: text("ip_range").notNull(),
  description: text("description"),
  enabled: boolean("enabled").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  createdBy: integer("created_by").references(() => users.id),
});

// Session management
export const activeSessions = pgTable("active_sessions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  sessionId: text("session_id").notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  lastActivity: timestamp("last_activity").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
});

// Enhanced role permissions
export const roles = pgTable("roles", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  description: text("description"),
  permissions: json("permissions").$type<{
    canViewUsers: boolean;
    canManageUsers: boolean;
    canViewRoles: boolean;
    canManageRoles: boolean;
    canViewAuditLogs: boolean;
    canManageSettings: boolean;
    canApproveItems: boolean;
    canDeleteItems: boolean;
    customPermissions: Record<string, boolean>;
  }>().notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Security audit log
export const securityAuditLog = pgTable("security_audit_log", {
  id: serial("id").primaryKey(),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
  userId: integer("user_id").references(() => users.id),
  actionType: text("action_type").notNull(), // LOGIN, LOGOUT, PASSWORD_CHANGE, 2FA_ENABLE, etc.
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  details: jsonb("details"),
  success: boolean("success").notNull(),
});

// Common status type
export const ItemStatus = z.enum(["LOST", "FOUND", "REVIEW"]);
export type ItemStatus = z.infer<typeof ItemStatus>;

// Helper function to validate dates
const validateDate = (date: string) => {
  const parsed = new Date(date);
  return !isNaN(parsed.getTime());
};

// Document metadata validation schema
export const DocumentMetadataSchema = z.object({
  issuer: z.string()
    .min(2, "Issuer name must be at least 2 characters")
    .max(100, "Issuer name cannot exceed 100 characters"),
  issueDate: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Issue date must be in YYYY-MM-DD format")
    .refine(date => validateDate(date), "Invalid date format")
    .refine(date => new Date(date) <= new Date(), "Issue date cannot be in the future"),
  expiryDate: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Expiry date must be in YYYY-MM-DD format")
    .refine(date => validateDate(date), "Invalid date format")
    .refine((date, ctx) => {
      const issueDate = ctx.parent.issueDate;
      return new Date(date) > new Date(issueDate);
    }, "Expiry date must be after issue date")
    .optional(),
  documentNumber: z.string()
    .min(1, "Document number is required")
    .refine((val, ctx) => {
      // Different validation rules based on document type
      switch (ctx.parent.type) {
        case "PASSPORT":
          return /^[A-Z]{2}\d{7}$/.test(val); // Example: AB1234567
        case "ID_CARD":
          return /^\d{9}$/.test(val); // Example: 123456789
        case "DRIVING_LICENSE":
          return /^[A-Z]\d{8}$/.test(val); // Example: D12345678
        default:
          return true;
      }
    }, "Invalid document number format"),
  type: z.enum(["PASSPORT", "ID_CARD", "DRIVING_LICENSE", "OTHER"]),
  additionalDetails: z.record(z.string()).optional(),
});

// Device metadata validation schema
export const DeviceMetadataSchema = z.object({
  manufacturer: z.string()
    .min(2, "Manufacturer name must be at least 2 characters")
    .max(50, "Manufacturer name cannot exceed 50 characters"),
  modelNumber: z.string()
    .min(3, "Model number must be at least 3 characters")
    .max(50, "Model number cannot exceed 50 characters")
    .regex(/^[A-Za-z0-9\-_]+$/, "Model number can only contain letters, numbers, hyphens and underscores"),
  color: z.string()
    .min(2, "Color description must be at least 2 characters")
    .max(30, "Color description cannot exceed 30 characters"),
  purchaseDate: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Purchase date must be in YYYY-MM-DD format")
    .refine(date => validateDate(date), "Invalid date format")
    .refine(date => new Date(date) <= new Date(), "Purchase date cannot be in the future")
    .optional(),
  specifications: z.record(z.string()).optional(),
  identifyingMarks: z.string()
    .max(500, "Identifying marks description cannot exceed 500 characters")
    .optional(),
});

// Documents table
export const documents = pgTable("documents", {
  id: serial("id").primaryKey(),
  uniqueId: text("unique_id").notNull().unique(), // For public reference
  title: text("title").notNull(),
  description: text("description").notNull(),
  category: text("category").notNull(),
  status: text("status").notNull(),
  lastLocation: text("last_location").notNull(),
  metadata: json("metadata").$type<z.infer<typeof DocumentMetadataSchema>>().notNull(),
  ownerInfo: json("owner_info").$type<Record<string, string>>(),
  reportedBy: integer("reported_by").references(() => users.id),
  reportedAt: timestamp("reported_at").notNull().defaultNow(),
  moderated: boolean("moderated").notNull().default(false),
  moderatedBy: integer("moderated_by").references(() => users.id),
  moderatedAt: timestamp("moderated_at"),
  qrCode: text("qr_code"), // New field for QR code data
  qrCodeGeneratedAt: timestamp("qr_code_generated_at"),
});

// Devices table
export const devices = pgTable("devices", {
  id: serial("id").primaryKey(),
  uniqueId: text("unique_id").notNull().unique(),
  category: text("category").notNull(),
  brandModel: text("brand_model").notNull(),
  serialNumber: text("serial_number").notNull(),
  description: text("description").notNull(),
  picture: text("picture"),
  metadata: json("metadata").$type<z.infer<typeof DeviceMetadataSchema>>().notNull(),
  ownerInfo: json("owner_info").$type<Record<string, string>>(),
  lastLocation: text("last_location").notNull(),
  status: text("status").notNull(),
  reportedBy: integer("reported_by").references(() => users.id),
  reportedAt: timestamp("reported_at").notNull().defaultNow(),
  moderated: boolean("moderated").notNull().default(false),
  moderatedBy: integer("moderated_by").references(() => users.id),
  moderatedAt: timestamp("moderated_at"),
  qrCode: text("qr_code"), // New field for QR code data
  qrCodeGeneratedAt: timestamp("qr_code_generated_at"),
});

// Add system metrics table
export const systemMetrics = pgTable("system_metrics", {
  id: serial("id").primaryKey(),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
  metricType: text("metric_type").notNull(), // API_CALL, ERROR, PERFORMANCE
  value: jsonb("value").notNull(),
  details: text("details"),
});

// Add analytics table
export const analytics = pgTable("analytics", {
  id: serial("id").primaryKey(),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
  eventType: text("event_type").notNull(), // ITEM_REPORTED, ITEM_FOUND, ITEM_RETURNED
  itemType: text("item_type").notNull(), // DOCUMENT, DEVICE
  itemId: integer("item_id").notNull(),
  userId: integer("user_id").references(() => users.id),
  metadata: jsonb("metadata"),
});

// Add user activity log
export const userActivityLog = pgTable("user_activity_log", {
  id: serial("id").primaryKey(),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
  userId: integer("user_id").references(() => users.id),
  actionType: text("action_type").notNull(), // LOGIN, LOGOUT, ITEM_CREATE, etc.
  details: jsonb("details"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
});

// Add API usage tracking
export const apiUsage = pgTable("api_usage", {
  id: serial("id").primaryKey(),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
  endpoint: text("endpoint").notNull(),
  method: text("method").notNull(),
  userId: integer("user_id").references(() => users.id),
  responseTime: integer("response_time").notNull(), // in milliseconds
  statusCode: integer("status_code").notNull(),
  ipAddress: text("ip_address"),
});

// Schema definitions
export const insertUserSchema = createInsertSchema(users)
  .pick({
    username: true,
    password: true,
    isAdmin: true,
    roleId: true,
    twoFactorEnabled: true,
  })
  .extend({
    password: z.string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
      .regex(/[a-z]/, "Password must contain at least one lowercase letter")
      .regex(/[0-9]/, "Password must contain at least one number")
      .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character"),
  });

export const insertRoleSchema = createInsertSchema(roles)
  .pick({
    name: true,
    description: true,
    permissions: true,
  });

export const insertIpAllowlistSchema = createInsertSchema(ipAllowlist)
  .pick({
    ipRange: true,
    description: true,
    enabled: true,
  });

export const insertSecurityAuditLogSchema = createInsertSchema(securityAuditLog)
  .pick({
    actionType: true,
    ipAddress: true,
    userAgent: true,
    details: true,
    success: true,
  });

// Document specific enums
export const DocumentCategory = z.enum(["ID", "CERTIFICATE", "LICENSE", "OTHER"]);
export type DocumentCategory = z.infer<typeof DocumentCategory>;

export const insertDocumentSchema = createInsertSchema(documents)
  .pick({
    title: true,
    description: true,
    category: true,
    status: true,
    lastLocation: true,
    metadata: true,
    ownerInfo: true,
  })
  .extend({
    status: ItemStatus,
    category: DocumentCategory,
    metadata: DocumentMetadataSchema,
    title: z.string()
      .min(5, "Title must be at least 5 characters")
      .max(100, "Title cannot exceed 100 characters"),
    description: z.string()
      .min(10, "Description must be at least 10 characters")
      .max(1000, "Description cannot exceed 1000 characters"),
    lastLocation: z.string()
      .min(3, "Location must be at least 3 characters")
      .max(200, "Location cannot exceed 200 characters"),
  });

// Device specific enums
export const DeviceCategory = z.enum(["COMPUTER", "PHONE", "TABLET", "OTHER"]);
export type DeviceCategory = z.infer<typeof DeviceCategory>;

export const insertDeviceSchema = createInsertSchema(devices)
  .pick({
    category: true,
    brandModel: true,
    serialNumber: true,
    description: true,
    picture: true,
    metadata: true,
    ownerInfo: true,
    lastLocation: true,
    status: true,
  })
  .extend({
    status: ItemStatus,
    category: DeviceCategory,
    serialNumber: z.string()
      .min(5, "Serial number/IMEI must be at least 5 characters")
      .refine((val: string) => {
        // IMEI validation (15 digits)
        if (/^\d{15}$/.test(val)) return true;
        // Serial number validation (alphanumeric, min 5 chars)
        return /^[A-Za-z0-9\-_]{5,}$/.test(val);
      }, "Invalid serial number/IMEI format"),
    metadata: DeviceMetadataSchema,
    brandModel: z.string()
      .min(3, "Brand & model must be at least 3 characters")
      .max(100, "Brand & model cannot exceed 100 characters"),
    description: z.string()
      .min(10, "Description must be at least 10 characters")
      .max(1000, "Description cannot exceed 1000 characters"),
    lastLocation: z.string()
      .min(3, "Location must be at least 3 characters")
      .max(200, "Location cannot exceed 200 characters"),
  });

// Add schemas for the new tables
export const insertSystemMetricSchema = createInsertSchema(systemMetrics).extend({
  metricType: z.enum(["API_CALL", "ERROR", "PERFORMANCE"]),
  value: z.record(z.unknown()),
});

export const insertAnalyticSchema = createInsertSchema(analytics).extend({
  eventType: z.enum(["ITEM_REPORTED", "ITEM_FOUND", "ITEM_RETURNED"]),
  itemType: z.enum(["DOCUMENT", "DEVICE"]),
  metadata: z.record(z.unknown()).optional(),
});

export const insertUserActivitySchema = createInsertSchema(userActivityLog).extend({
  actionType: z.enum([
    "LOGIN",
    "LOGOUT",
    "ITEM_CREATE",
    "ITEM_UPDATE",
    "ITEM_MODERATE",
    "SETTINGS_UPDATE"
  ]),
  details: z.record(z.unknown()).optional(),
});

export const insertApiUsageSchema = createInsertSchema(apiUsage);

// Type exports
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Role = typeof roles.$inferSelect;
export type InsertRole = z.infer<typeof insertRoleSchema>;
export type Document = typeof documents.$inferSelect;
export type InsertDocument = z.infer<typeof insertDocumentSchema>;
export type Device = typeof devices.$inferSelect;
export type InsertDevice = z.infer<typeof insertDeviceSchema>;

// Export types for the new tables
export type SystemMetric = typeof systemMetrics.$inferSelect;
export type InsertSystemMetric = z.infer<typeof insertSystemMetricSchema>;

export type Analytic = typeof analytics.$inferSelect;
export type InsertAnalytic = z.infer<typeof insertAnalyticSchema>;

export type UserActivity = typeof userActivityLog.$inferSelect;
export type InsertUserActivity = z.infer<typeof insertUserActivitySchema>;

export type ApiUsageMetric = typeof apiUsage.$inferSelect;
export type InsertApiUsageMetric = z.infer<typeof insertApiUsageSchema>;

export type IpAllowlist = typeof ipAllowlist.$inferSelect;
export type InsertIpAllowlist = z.infer<typeof insertIpAllowlistSchema>;
export type SecurityAuditLog = typeof securityAuditLog.$inferSelect;
export type InsertSecurityAuditLog = z.infer<typeof insertSecurityAuditLogSchema>;