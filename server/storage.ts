import { users, items, type User, type InsertUser, type Item, type InsertItem } from "@shared/schema";
import { db } from "./db";
import { eq, like, or } from "drizzle-orm";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { pool } from "./db";

const PostgresSessionStore = connectPg(session);

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, updates: Partial<User>): Promise<User>;
  getAllUsers(): Promise<User[]>;

  // Item methods
  getAllItems(): Promise<Item[]>;
  getUserItems(userId: number): Promise<Item[]>;
  getItem(id: number): Promise<Item | undefined>;
  createItem(item: InsertItem): Promise<Item>;
  updateItem(id: number, updates: Partial<Item>): Promise<Item>;
  searchItems(query: string): Promise<Item[]>;

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

  // User methods remain unchanged
  async getUser(id: number): Promise<User | undefined> {
    try {
      const [user] = await db.select().from(users).where(eq(users.id, id));
      return user;
    } catch (error) {
      console.error('Error getting user:', error);
      return undefined;
    }
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    try {
      const [user] = await db.select().from(users).where(eq(users.username, username));
      return user;
    } catch (error) {
      console.error('Error getting user by username:', error);
      return undefined;
    }
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    try {
      const [user] = await db.insert(users).values(insertUser).returning();
      return user;
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }

  async updateUser(id: number, updates: Partial<User>): Promise<User> {
    try {
      const [user] = await db
        .update(users)
        .set(updates)
        .where(eq(users.id, id))
        .returning();
      return user;
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  }

  async getAllUsers(): Promise<User[]> {
    try {
      return await db.select().from(users);
    } catch (error) {
      console.error('Error getting all users:', error);
      throw error;
    }
  }

  // Item methods
  async getAllItems(): Promise<Item[]> {
    try {
      return await db.select().from(items);
    } catch (error) {
      console.error('Error getting all items:', error);
      throw error;
    }
  }

  async getUserItems(userId: number): Promise<Item[]> {
    try {
      return await db.select()
        .from(items)
        .where(eq(items.reportedBy, userId));
    } catch (error) {
      console.error('Error getting user items:', error);
      throw error;
    }
  }

  async getItem(id: number): Promise<Item | undefined> {
    try {
      const [item] = await db.select().from(items).where(eq(items.id, id));
      return item;
    } catch (error) {
      console.error('Error getting item:', error);
      return undefined;
    }
  }

  async createItem(insertItem: InsertItem): Promise<Item> {
    try {
      const [item] = await db.insert(items).values(insertItem).returning();
      return item;
    } catch (error) {
      console.error('Error creating item:', error);
      throw error;
    }
  }

  async updateItem(id: number, updates: Partial<Item>): Promise<Item> {
    try {
      const [item] = await db
        .update(items)
        .set(updates)
        .where(eq(items.id, id))
        .returning();
      return item;
    } catch (error) {
      console.error('Error updating item:', error);
      throw error;
    }
  }

  async searchItems(query: string): Promise<Item[]> {
    try {
      if (!query) return [];
      return await db
        .select()
        .from(items)
        .where(
          or(
            like(items.name, `%${query}%`),
            like(items.description, `%${query}%`),
            like(items.location, `%${query}%`)
          )
        );
    } catch (error) {
      console.error('Error searching items:', error);
      throw error;
    }
  }
}

export const storage = new DatabaseStorage();