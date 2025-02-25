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

// Documents table
export const documents = pgTable("documents", {
  id: serial("id").primaryKey(),
  uniqueId: text("unique_id").notNull().unique(), // For public reference
  title: text("title").notNull(),
  description: text("description").notNull(),
  category: text("category").notNull(),
  status: text("status").notNull(),
  lastLocation: text("last_location").notNull(),
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
    ownerInfo: true,
  })
  .extend({
    status: ItemStatus,
    category: DocumentCategory,
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
    ownerInfo: true,
    lastLocation: true,
    status: true,
  })
  .extend({
    status: ItemStatus,
    category: DeviceCategory,
    serialNumber: z.string().min(1, "Serial number/IMEI is required"),
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