import { users, items, userActivityLog, type User, type InsertUser, type Item, type InsertItem, type UserActivityLog } from "@shared/schema";
import { db } from "./db";
import { eq, like, or, isNull } from "drizzle-orm";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { pool } from "./db";

const PostgresSessionStore = connectPg(session);

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  createItem(item: InsertItem & { reportedBy: number }): Promise<Item>;
  getItem(id: number): Promise<Item | undefined>;
  getItemByUniqueId(uniqueId: string): Promise<Item | undefined>;
  updateItemStatus(id: number, status: Item["status"]): Promise<Item>;
  searchItems(query: string): Promise<Item[]>;
  getUserItems(userId: number): Promise<Item[]>;
  getAllUsers(): Promise<User[]>;
  getAllItems(): Promise<Item[]>;
  updateUser(id: number, updates: Partial<User>): Promise<User>;
  getActivityLogs(): Promise<UserActivityLog[]>;
  getUnmoderatedItems(): Promise<Item[]>;
  moderateItem(id: number, moderatorId: number): Promise<Item>;
  logActivity(log: Omit<UserActivityLog, "id" | "createdAt">): Promise<UserActivityLog>;
  sessionStore: session.Store;
}

export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    this.sessionStore = new PostgresSessionStore({
      pool,
      createTableIfMissing: true,
    });
  }

  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async createItem(item: InsertItem & { reportedBy: number }): Promise<Item> {
    const [newItem] = await db
      .insert(items)
      .values({
        ...item,
        uniqueId: `ITEM-${Math.random().toString(36).slice(2, 7).toUpperCase()}`,
      })
      .returning();
    return newItem;
  }

  async getItem(id: number): Promise<Item | undefined> {
    const [item] = await db.select().from(items).where(eq(items.id, id));
    return item;
  }

  async getItemByUniqueId(uniqueId: string): Promise<Item | undefined> {
    const [item] = await db.select().from(items).where(eq(items.uniqueId, uniqueId));
    return item;
  }

  async updateItemStatus(id: number, status: Item["status"]): Promise<Item> {
    const [item] = await db
      .update(items)
      .set({ status })
      .where(eq(items.id, id))
      .returning();
    return item;
  }

  async searchItems(query: string): Promise<Item[]> {
    if (!query) return [];

    return db
      .select()
      .from(items)
      .where(
        or(
          like(items.name, `%${query}%`),
          like(items.description, `%${query}%`),
          eq(items.uniqueId, query)
        )
      );
  }

  async getUserItems(userId: number): Promise<Item[]> {
    return db.select().from(items).where(eq(items.reportedBy, userId));
  }

  async getAllUsers(): Promise<User[]> {
    return db.select().from(users);
  }

  async getAllItems(): Promise<Item[]> {
    return db.select().from(items);
  }

  async updateUser(id: number, updates: Partial<User>): Promise<User> {
    const [user] = await db
      .update(users)
      .set(updates)
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async getActivityLogs(): Promise<UserActivityLog[]> {
    return db.select().from(userActivityLog).orderBy(userActivityLog.createdAt);
  }

  async getUnmoderatedItems(): Promise<Item[]> {
    return db
      .select()
      .from(items)
      .where(isNull(items.moderated));
  }

  async moderateItem(id: number, moderatorId: number): Promise<Item> {
    const [item] = await db
      .update(items)
      .set({
        moderated: true,
        moderatedBy: moderatorId,
        moderatedAt: new Date(),
      })
      .where(eq(items.id, id))
      .returning();
    return item;
  }

  async logActivity(log: Omit<UserActivityLog, "id" | "createdAt">): Promise<UserActivityLog> {
    const [activity] = await db
      .insert(userActivityLog)
      .values(log)
      .returning();
    return activity;
  }
}

export const storage = new DatabaseStorage();