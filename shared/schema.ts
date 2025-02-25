import { pgTable, text, serial, timestamp, boolean, json, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  profilePicture: text("profile_picture"),
  isAdmin: boolean("is_admin").notNull().default(false),
  roleId: integer("role_id").references(() => roles.id),
  createdAt: timestamp("created_at").notNull().defaultNow()
});

// Role definition table
export const roles = pgTable("roles", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  description: text("description"),
  permissions: json("permissions").$type<string[]>().notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
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
});

// Devices table
export const devices = pgTable("devices", {
  id: serial("id").primaryKey(),
  uniqueId: text("unique_id").notNull().unique(), // For public reference
  category: text("category").notNull(),
  brandModel: text("brand_model").notNull(),
  serialNumber: text("serial_number").notNull(), // Required
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
});

// Schema definitions
export const insertUserSchema = createInsertSchema(users)
  .pick({
    username: true,
    password: true,
    isAdmin: true,
    roleId: true,
  });

export const insertRoleSchema = createInsertSchema(roles)
  .pick({
    name: true,
    description: true,
    permissions: true,
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
      .refine((val) => {
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

// Type exports
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Role = typeof roles.$inferSelect;
export type InsertRole = z.infer<typeof insertRoleSchema>;
export type Document = typeof documents.$inferSelect;
export type InsertDocument = z.infer<typeof insertDocumentSchema>;
export type Device = typeof devices.$inferSelect;
export type InsertDevice = z.infer<typeof insertDeviceSchema>;