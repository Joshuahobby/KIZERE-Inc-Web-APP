import { users, roles, agents, subscribers, documents, devices, 
  type User, type InsertUser, type Role, type InsertRole,
  type Agent, type InsertAgent, type Subscriber, type InsertSubscriber,
  type Document, type InsertDocument, type Device, type InsertDevice } from "@shared/schema";
import { db } from "./db";
import { eq, like, or } from "drizzle-orm";
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

  // Agent methods
  createAgent(agent: InsertAgent): Promise<Agent>;
  getAgent(id: number): Promise<Agent | undefined>;
  getAgentByUsername(username: string): Promise<Agent | undefined>;
  updateAgent(id: number, updates: Partial<Agent>): Promise<Agent>;
  getAllAgents(): Promise<Agent[]>;

  // Subscriber methods
  createSubscriber(subscriber: InsertSubscriber): Promise<Subscriber>;
  getSubscriber(id: number): Promise<Subscriber | undefined>;
  getSubscriberByEmail(email: string): Promise<Subscriber | undefined>;
  updateSubscriber(id: number, updates: Partial<Subscriber>): Promise<Subscriber>;
  getAllSubscribers(): Promise<Subscriber[]>;

  // Document methods
  createDocument(document: InsertDocument, agentId: number): Promise<Document>;
  getDocument(id: number): Promise<Document | undefined>;
  updateDocument(id: number, updates: Partial<Document>): Promise<Document>;
  getAllDocuments(): Promise<Document[]>;
  getUnmoderatedDocuments(): Promise<Document[]>;
  moderateDocument(id: number, moderatorId: number): Promise<Document>;
  searchDocuments(query: string): Promise<Document[]>;

  // Device methods
  createDevice(device: InsertDevice, agentId: number): Promise<Device>;
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

  // Agent methods implementation
  async createAgent(agent: InsertAgent): Promise<Agent> {
    try {
      const [newAgent] = await db.insert(agents).values(agent).returning();
      return newAgent;
    } catch (error) {
      console.error('Error creating agent:', error);
      throw error;
    }
  }

  async getAgent(id: number): Promise<Agent | undefined> {
    try {
      const [agent] = await db.select().from(agents).where(eq(agents.id, id));
      return agent;
    } catch (error) {
      console.error('Error getting agent:', error);
      return undefined;
    }
  }

  async getAgentByUsername(username: string): Promise<Agent | undefined> {
    try {
      const [agent] = await db.select().from(agents).where(eq(agents.username, username));
      return agent;
    } catch (error) {
      console.error('Error getting agent by username:', error);
      return undefined;
    }
  }

  async updateAgent(id: number, updates: Partial<Agent>): Promise<Agent> {
    try {
      const [agent] = await db
        .update(agents)
        .set(updates)
        .where(eq(agents.id, id))
        .returning();
      return agent;
    } catch (error) {
      console.error('Error updating agent:', error);
      throw error;
    }
  }

  async getAllAgents(): Promise<Agent[]> {
    try {
      return await db.select().from(agents);
    } catch (error) {
      console.error('Error getting all agents:', error);
      throw error;
    }
  }

  // Subscriber methods implementation
  async createSubscriber(subscriber: InsertSubscriber): Promise<Subscriber> {
    try {
      const [newSubscriber] = await db.insert(subscribers).values(subscriber).returning();
      return newSubscriber;
    } catch (error) {
      console.error('Error creating subscriber:', error);
      throw error;
    }
  }

  async getSubscriber(id: number): Promise<Subscriber | undefined> {
    try {
      const [subscriber] = await db.select().from(subscribers).where(eq(subscribers.id, id));
      return subscriber;
    } catch (error) {
      console.error('Error getting subscriber:', error);
      return undefined;
    }
  }

  async getSubscriberByEmail(email: string): Promise<Subscriber | undefined> {
    try {
      const [subscriber] = await db.select().from(subscribers).where(eq(subscribers.email, email));
      return subscriber;
    } catch (error) {
      console.error('Error getting subscriber by email:', error);
      return undefined;
    }
  }

  async updateSubscriber(id: number, updates: Partial<Subscriber>): Promise<Subscriber> {
    try {
      const [subscriber] = await db
        .update(subscribers)
        .set(updates)
        .where(eq(subscribers.id, id))
        .returning();
      return subscriber;
    } catch (error) {
      console.error('Error updating subscriber:', error);
      throw error;
    }
  }

  async getAllSubscribers(): Promise<Subscriber[]> {
    try {
      return await db.select().from(subscribers);
    } catch (error) {
      console.error('Error getting all subscribers:', error);
      throw error;
    }
  }

  // Document methods implementation
  async createDocument(document: InsertDocument, agentId: number): Promise<Document> {
    try {
      const [newDocument] = await db.insert(documents).values({
        ...document,
        uniqueId: nanoid(10), 
        reportedBy: agentId,
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
      return await db
        .select()
        .from(documents)
        .where(
          or(
            like(documents.title, `%${query}%`),
            like(documents.description, `%${query}%`),
            like(documents.lastLocation, `%${query}%`)
          )
        );
    } catch (error) {
      console.error('Error searching documents:', error);
      throw error;
    }
  }

  // Device methods implementation
  async createDevice(device: InsertDevice, agentId: number): Promise<Device> {
    try {
      const [newDevice] = await db.insert(devices).values({
        ...device,
        uniqueId: nanoid(10), 
        reportedBy: agentId,
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
      return await db
        .select()
        .from(devices)
        .where(
          or(
            like(devices.category, `%${query}%`),
            like(devices.brandModel, `%${query}%`),
            like(devices.description, `%${query}%`),
            like(devices.lastLocation, `%${query}%`)
          )
        );
    } catch (error) {
      console.error('Error searching devices:', error);
      throw error;
    }
  }
}

export const storage = new DatabaseStorage();