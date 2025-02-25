import { users, roles, documents, devices, 
  type User, type InsertUser, type Role, type InsertRole,
  type Document, type InsertDocument, type Device, type InsertDevice } from "@shared/schema";
import { db } from "./db";
import { eq, like, or, and, sql } from "drizzle-orm";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { pool } from "./db";
import { nanoid } from 'nanoid';

const PostgresSessionStore = connectPg(session);

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, updates: Partial<User>): Promise<User>;
  getAllUsers(): Promise<User[]>;

  // Role methods
  createRole(role: InsertRole): Promise<Role>;
  getRole(id: number): Promise<Role | undefined>;
  getAllRoles(): Promise<Role[]>;
  updateRole(id: number, updates: Partial<Role>): Promise<Role>;
  deleteRole(id: number): Promise<void>;

  // Document methods
  createDocument(document: InsertDocument, userId: number): Promise<Document>;
  getDocument(id: number): Promise<Document | undefined>;
  updateDocument(id: number, updates: Partial<Document>): Promise<Document>;
  getAllDocuments(): Promise<Document[]>;
  getUnmoderatedDocuments(): Promise<Document[]>;
  moderateDocument(id: number, moderatorId: number): Promise<Document>;
  searchDocuments(query: string): Promise<Document[]>;

  // Device methods
  createDevice(device: InsertDevice, userId: number): Promise<Device>;
  getDevice(id: number): Promise<Device | undefined>;
  updateDevice(id: number, updates: Partial<Device>): Promise<Device>;
  getAllDevices(): Promise<Device[]>;
  getUnmoderatedDevices(): Promise<Device[]>;
  moderateDevice(id: number, moderatorId: number): Promise<Device>;
  searchDevices(query: string): Promise<Device[]>;

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

  // User methods implementation...
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

  // Role methods implementation...
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

  // Document methods implementation
  async createDocument(document: InsertDocument, userId: number): Promise<Document> {
    try {
      const [newDocument] = await db.insert(documents).values({
        ...document,
        uniqueId: nanoid(10),
        reportedBy: userId,
        reportedAt: new Date(),
      }).returning();
      return newDocument;
    } catch (error) {
      console.error('Error creating document:', error);
      throw error;
    }
  }

  async getDocument(id: number): Promise<Document | undefined> {
    try {
      const [document] = await db.select().from(documents).where(eq(documents.id, id));
      return document;
    } catch (error) {
      console.error('Error getting document:', error);
      return undefined;
    }
  }

  async updateDocument(id: number, updates: Partial<Document>): Promise<Document> {
    try {
      const [document] = await db
        .update(documents)
        .set(updates)
        .where(eq(documents.id, id))
        .returning();
      return document;
    } catch (error) {
      console.error('Error updating document:', error);
      throw error;
    }
  }

  async getAllDocuments(): Promise<Document[]> {
    try {
      return await db.select().from(documents);
    } catch (error) {
      console.error('Error getting all documents:', error);
      throw error;
    }
  }

  async getUnmoderatedDocuments(): Promise<Document[]> {
    try {
      return await db
        .select()
        .from(documents)
        .where(eq(documents.moderated, false));
    } catch (error) {
      console.error('Error getting unmoderated documents:', error);
      throw error;
    }
  }

  async moderateDocument(id: number, moderatorId: number): Promise<Document> {
    try {
      const [document] = await db
        .update(documents)
        .set({
          moderated: true,
          moderatedBy: moderatorId,
          moderatedAt: new Date(),
        })
        .where(eq(documents.id, id))
        .returning();
      return document;
    } catch (error) {
      console.error('Error moderating document:', error);
      throw error;
    }
  }

  async searchDocuments(query: string): Promise<Document[]> {
    try {
      if (!query) return [];

      const results = await db.select()
        .from(documents)
        .where(
          and(
            or(
              eq(documents.uniqueId, query),
              sql`${documents.metadata}->>'documentNumber' = ${query}`
            ),
            eq(documents.moderated, true)
          )
        );

      return results;
    } catch (error) {
      console.error('Error searching documents:', error);
      throw error;
    }
  }

  // Device methods implementation
  async createDevice(device: InsertDevice, userId: number): Promise<Device> {
    try {
      const [newDevice] = await db.insert(devices).values({
        ...device,
        uniqueId: nanoid(10),
        reportedBy: userId,
        reportedAt: new Date(),
      }).returning();
      return newDevice;
    } catch (error) {
      console.error('Error creating device:', error);
      throw error;
    }
  }

  async getDevice(id: number): Promise<Device | undefined> {
    try {
      const [device] = await db.select().from(devices).where(eq(devices.id, id));
      return device;
    } catch (error) {
      console.error('Error getting device:', error);
      return undefined;
    }
  }

  async updateDevice(id: number, updates: Partial<Device>): Promise<Device> {
    try {
      const [device] = await db
        .update(devices)
        .set(updates)
        .where(eq(devices.id, id))
        .returning();
      return device;
    } catch (error) {
      console.error('Error updating device:', error);
      throw error;
    }
  }

  async getAllDevices(): Promise<Device[]> {
    try {
      return await db.select().from(devices);
    } catch (error) {
      console.error('Error getting all devices:', error);
      throw error;
    }
  }

  async getUnmoderatedDevices(): Promise<Device[]> {
    try {
      return await db
        .select()
        .from(devices)
        .where(eq(devices.moderated, false));
    } catch (error) {
      console.error('Error getting unmoderated devices:', error);
      throw error;
    }
  }

  async moderateDevice(id: number, moderatorId: number): Promise<Device> {
    try {
      const [device] = await db
        .update(devices)
        .set({
          moderated: true,
          moderatedBy: moderatorId,
          moderatedAt: new Date(),
        })
        .where(eq(devices.id, id))
        .returning();
      return device;
    } catch (error) {
      console.error('Error moderating device:', error);
      throw error;
    }
  }

  async searchDevices(query: string): Promise<Device[]> {
    try {
      if (!query) return [];

      const results = await db.select()
        .from(devices)
        .where(
          and(
            or(
              eq(devices.uniqueId, query),
              eq(devices.serialNumber, query)
            ),
            eq(devices.moderated, true)
          )
        );

      return results;
    } catch (error) {
      console.error('Error searching devices:', error);
      throw error;
    }
  }
}

export const storage = new DatabaseStorage();