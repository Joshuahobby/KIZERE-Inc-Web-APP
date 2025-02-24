import { pgTable, text, serial, timestamp, boolean, json, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Role definition table
export const roles = pgTable("roles", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  description: text("description"),
  permissions: json("permissions").$type<string[]>().notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  profilePicture: text("profile_picture"),
  roleId: integer("role_id").references(() => roles.id),
  isAdmin: boolean("is_admin").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const items = pgTable("items", {
  id: serial("id").primaryKey(),
  uniqueId: text("unique_id").notNull().unique(),
  name: text("name").notNull(),
  category: text("category").notNull(),
  description: text("description").notNull(),
  status: text("status").notNull(), // LOST, FOUND, CLAIMED, RETURNED
  location: text("location").notNull(),
  reportedBy: serial("reported_by").references(() => users.id),
  images: text("images").array(),
  metadata: json("metadata").$type<Record<string, string>>(),
  reportedAt: timestamp("reported_at").notNull().defaultNow(),
  moderated: boolean("moderated").notNull().default(false),
  moderatedBy: serial("moderated_by").references(() => users.id),
  moderatedAt: timestamp("moderated_at"),
  registrationNumber: text("registration_number"),
  serialNumber: text("serial_number"),
  brand: text("brand"),
  model: text("model"),
});

export const userActivityLog = pgTable("user_activity_log", {
  id: serial("id").primaryKey(),
  userId: serial("user_id").references(() => users.id),
  action: text("action").notNull(), // LOGIN, LOGOUT, ITEM_REPORT, ITEM_UPDATE
  details: json("details").$type<Record<string, any>>(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Role schemas
export const insertRoleSchema = createInsertSchema(roles).pick({
  name: true,
  description: true,
  permissions: true,
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertItemSchema = createInsertSchema(items)
  .pick({
    name: true,
    category: true,
    description: true,
    status: true,
    location: true,
    images: true,
    metadata: true,
    registrationNumber: true,
    serialNumber: true,
    brand: true,
    model: true,
  })
  .extend({
    status: z.enum(["LOST", "FOUND", "CLAIMED", "RETURNED"]),
    category: z.enum(["DOCUMENTS", "ELECTRONICS", "CLOTHING", "ACCESSORIES", "OTHER"]),
  });

export type Role = typeof roles.$inferSelect;
export type InsertRole = z.infer<typeof insertRoleSchema>;
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Item = typeof items.$inferSelect;
export type InsertItem = z.infer<typeof insertItemSchema>;
export type UserActivityLog = typeof userActivityLog.$inferSelect;