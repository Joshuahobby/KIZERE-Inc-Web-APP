import { agents, documents, devices, subscribers, roles, type Agent, type InsertAgent, type Document, type Device, type InsertDocument, type InsertDevice, type Role, type InsertRole } from "@shared/schema";
import { db } from "./db";
import { eq, like, or, isNull } from "drizzle-orm";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { pool } from "./db";

const PostgresSessionStore = connectPg(session);

export interface IStorage {
  // Agent methods
  getAgent(id: number): Promise<Agent | undefined>;
  getAgentByUsername(username: string): Promise<Agent | undefined>;
  createAgent(agent: InsertAgent): Promise<Agent>;
  getAllAgents(): Promise<Agent[]>;
  updateAgent(id: number, updates: Partial<Agent>): Promise<Agent>;

  // Document methods
  createDocument(doc: InsertDocument & { reportedBy: number }): Promise<Document>;
  getDocument(id: number): Promise<Document | undefined>;
  getDocumentByUniqueId(uniqueId: string): Promise<Document | undefined>;
  updateDocumentStatus(id: number, status: Document["status"]): Promise<Document>;
  searchDocuments(query: string): Promise<Document[]>;
  getAgentDocuments(agentId: number): Promise<Document[]>;
  getAllDocuments(): Promise<Document[]>;
  getUnmoderatedDocuments(): Promise<Document[]>;
  moderateDocument(id: number, moderatorId: number): Promise<Document>;

  // Device methods
  createDevice(device: InsertDevice & { reportedBy: number }): Promise<Device>;
  getDevice(id: number): Promise<Device | undefined>;
  getDeviceByUniqueId(uniqueId: string): Promise<Device | undefined>;
  updateDeviceStatus(id: number, status: Device["status"]): Promise<Device>;
  searchDevices(query: string): Promise<Device[]>;
  getAgentDevices(agentId: number): Promise<Device[]>;
  getAllDevices(): Promise<Device[]>;
  getUnmoderatedDevices(): Promise<Device[]>;
  moderateDevice(id: number, moderatorId: number): Promise<Device>;

  // Role methods
  createRole(role: InsertRole): Promise<Role>;
  getRole(id: number): Promise<Role | undefined>;
  getAllRoles(): Promise<Role[]>;
  updateRole(id: number, updates: Partial<Role>): Promise<Role>;
  deleteRole(id: number): Promise<void>;
  assignAgentRole(agentId: number, roleId: number): Promise<Agent>;

  sessionStore: session.Store;
}

  }

export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    this.sessionStore = new PostgresSessionStore({
      pool,
      createTableIfMissing: true,
    });
  }

  // Existing methods remain unchanged
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
          eq(items.uniqueId, query),
          like(items.registrationNumber, `%${query}%`),
          like(items.serialNumber, `%${query}%`)
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

  // New methods for role management
  async createRole(role: InsertRole): Promise<Role> {
    const [newRole] = await db.insert(roles).values({
      name: role.name,
      description: role.description,
      permissions: role.permissions as string[],
    }).returning();
    return newRole;
  }

  async getRole(id: number): Promise<Role | undefined> {
    const [role] = await db.select().from(roles).where(eq(roles.id, id));
    return role;
  }

  async getAllRoles(): Promise<Role[]> {
    return db.select().from(roles);
  }

  async updateRole(id: number, updates: Partial<Role>): Promise<Role> {
    const [role] = await db
      .update(roles)
      .set(updates)
      .where(eq(roles.id, id))
      .returning();
    return role;
  }

  async deleteRole(id: number): Promise<void> {
    await db.delete(roles).where(eq(roles.id, id));
  }

  async assignUserRole(userId: number, roleId: number): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ roleId })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }
}

export const storage = new DatabaseStorage();