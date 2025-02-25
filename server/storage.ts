import { users, items, roles, type User, type InsertUser, type Item, type InsertItem, type Role, type InsertRole } from "@shared/schema";
import { db } from "./db";
import { eq, like, or, isNull } from "drizzle-orm";
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
  getUnmoderatedItems(): Promise<Item[]>;
  moderateItem(id: number, moderatorId: number): Promise<Item>;

  // Role methods
  createRole(role: InsertRole): Promise<Role>;
  getRole(id: number): Promise<Role | undefined>;
  getAllRoles(): Promise<Role[]>;
  updateRole(id: number, updates: Partial<Role>): Promise<Role>;
  deleteRole(id: number): Promise<void>;

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

  // User methods
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
      const [item] = await db.insert(items).values({
        ...insertItem,
        reportedAt: new Date(),
      }).returning();
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

  async getUnmoderatedItems(): Promise<Item[]> {
    try {
      return await db
        .select()
        .from(items)
        .where(eq(items.moderated, false));
    } catch (error) {
      console.error('Error getting unmoderated items:', error);
      throw error;
    }
  }

  async moderateItem(id: number, moderatorId: number): Promise<Item> {
    try {
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
    } catch (error) {
      console.error('Error moderating item:', error);
      throw error;
    }
  }

  // Role methods
  async createRole(role: InsertRole): Promise<Role> {
    try {
      const [newRole] = await db.insert(roles).values(role).returning();
      return newRole;
    } catch (error) {
      console.error('Error creating role:', error);
      throw error;
    }
  }

  async getRole(id: number): Promise<Role | undefined> {
    try {
      const [role] = await db.select().from(roles).where(eq(roles.id, id));
      return role;
    } catch (error) {
      console.error('Error getting role:', error);
      return undefined;
    }
  }

  async getAllRoles(): Promise<Role[]> {
    try {
      return await db.select().from(roles);
    } catch (error) {
      console.error('Error getting all roles:', error);
      throw error;
    }
  }

  async updateRole(id: number, updates: Partial<Role>): Promise<Role> {
    try {
      const [role] = await db
        .update(roles)
        .set(updates)
        .where(eq(roles.id, id))
        .returning();
      return role;
    } catch (error) {
      console.error('Error updating role:', error);
      throw error;
    }
  }

  async deleteRole(id: number): Promise<void> {
    try {
      await db.delete(roles).where(eq(roles.id, id));
    } catch (error) {
      console.error('Error deleting role:', error);
      throw error;
    }
  }
}

export const storage = new DatabaseStorage();