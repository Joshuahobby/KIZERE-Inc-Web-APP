import { pgTable, text, serial, timestamp, boolean, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
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
  })
  .extend({
    status: z.enum(["LOST", "FOUND", "CLAIMED", "RETURNED"]),
    category: z.enum(["DOCUMENTS", "ELECTRONICS", "CLOTHING", "ACCESSORIES", "OTHER"]),
  });

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Item = typeof items.$inferSelect;
export type InsertItem = z.infer<typeof insertItemSchema>;
