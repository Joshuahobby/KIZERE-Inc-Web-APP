import { 
  users, roles, documents, devices, systemMetrics, analytics, userActivityLog, apiUsage,
  ipAllowlist, securityAuditLog, activeSessions,
  type User, type InsertUser, type Role, type InsertRole,
  type Document, type InsertDocument, type Device, type InsertDevice,
  type SystemMetric, type InsertSystemMetric, type Analytic, type InsertAnalytic,
  type UserActivity, type InsertUserActivity, type ApiUsageMetric, type InsertApiUsageMetric,
  type IpAllowlist, type InsertIpAllowlist, type SecurityAuditLog, type InsertSecurityAuditLog,
  type RegisteredItem, type InsertRegisteredItem
} from "@shared/schema";
import { db } from "./db";
import { eq, sql, desc } from "drizzle-orm";
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

  // Analytics methods
  recordAnalyticEvent(event: InsertAnalytic): Promise<Analytic>;
  getAnalytics(startDate: Date, endDate: Date): Promise<Analytic[]>;
  getItemReturnRate(): Promise<{ total: number; returned: number; rate: number }>;
  getPopularCategories(): Promise<{ category: string; count: number }[]>;

  // System monitoring methods
  recordSystemMetric(metric: InsertSystemMetric): Promise<SystemMetric>;
  getSystemMetrics(type: string, startDate: Date, endDate: Date): Promise<SystemMetric[]>;

  // User activity methods
  recordUserActivity(activity: InsertUserActivity): Promise<UserActivity>;
  getUserActivities(userId: number): Promise<UserActivity[]>;

  // API usage methods
  recordApiUsage(usage: InsertApiUsageMetric): Promise<ApiUsageMetric>;
  getApiUsageStats(startDate: Date, endDate: Date): Promise<ApiUsageMetric[]>;

  // Security features
  getIpAllowlist(): Promise<IpAllowlist[]>;
  addIpAllowlist(data: InsertIpAllowlist & { createdBy: number }): Promise<IpAllowlist>;
  logSecurityAudit(data: InsertSecurityAuditLog & { userId: number }): Promise<SecurityAuditLog>;
  getSecurityAuditLogs(): Promise<SecurityAuditLog[]>;
  getUserSessions(userId: number): Promise<{ id: string; userAgent: string; ipAddress: string; lastActivity: string }[]>;
  terminateSession(sessionId: string): Promise<void>;

  sessionStore: session.Store;

  // Registered items methods
  createRegisteredItem(item: InsertRegisteredItem, userId: number): Promise<RegisteredItem>;
  getRegisteredItem(id: number): Promise<RegisteredItem | undefined>;
  getRegisteredItemByOfficialId(officialId: string): Promise<RegisteredItem | undefined>;
  getUserRegisteredItems(userId: number): Promise<RegisteredItem[]>;
  updateRegisteredItem(id: number, updates: Partial<RegisteredItem>): Promise<RegisteredItem>;
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
      console.log('Creating document with data:', document);
      const [newDocument] = await db.insert(documents).values({
        ...document,
        uniqueId: nanoid(10),
        reportedBy: userId,
        reportedAt: new Date(),
        moderated: false,
        suggestedCategories: [],
        categoryFeatures: {},
        socialShares: [],
        totalShares: 0,
      }).returning();

      console.log('Document created successfully:', newDocument);
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

      console.log('Searching documents with query:', query);

      const results = await db.select()
        .from(documents)
        .where(
          and(
            or(
              eq(documents.uniqueId, query),
              // Use proper JSON operator and cast the value
              sql`${documents.metadata}->>'documentNumber' = ${query}::text`
            ),
            eq(documents.moderated, true)
          )
        );

      console.log('Document search results:', results);
      return results;
    } catch (error) {
      console.error('Error searching documents:', error);
      throw error;
    }
  }

  // Device methods implementation
  async createDevice(device: InsertDevice, userId: number): Promise<Device> {
    try {
      console.log('Creating device with data:', device);
      const [newDevice] = await db.insert(devices).values({
        ...device,
        uniqueId: nanoid(10),
        reportedBy: userId,
        reportedAt: new Date(),
        moderated: false,
        suggestedCategories: [],
        categoryFeatures: {},
        socialShares: [],
        totalShares: 0,
      }).returning();

      console.log('Device created successfully:', newDevice);
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

      console.log('Searching devices with query:', query);

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

      console.log('Device search results:', results);
      return results;
    } catch (error) {
      console.error('Error searching devices:', error);
      throw error;
    }
  }

  // Analytics implementation
  async recordAnalyticEvent(event: InsertAnalytic): Promise<Analytic> {
    try {
      const [analytic] = await db.insert(analytics).values(event).returning();
      return analytic;
    } catch (error) {
      console.error('Error recording analytic event:', error);
      throw error;
    }
  }

  async getAnalytics(startDate: Date, endDate: Date): Promise<Analytic[]> {
    try {
      return await db.select()
        .from(analytics)
        .where(sql`${analytics.timestamp} BETWEEN ${startDate} AND ${endDate}`);
    } catch (error) {
      console.error('Error getting analytics:', error);
      throw error;
    }
  }

  async getItemReturnRate(): Promise<{ total: number; returned: number; rate: number }> {
    try {
      const total = await db.select({ count: sql<number>`count(*)` })
        .from(analytics)
        .where(eq(analytics.eventType, 'ITEM_REPORTED'));

      const returned = await db.select({ count: sql<number>`count(*)` })
        .from(analytics)
        .where(eq(analytics.eventType, 'ITEM_RETURNED'));

      const totalCount = total[0]?.count || 0;
      const returnedCount = returned[0]?.count || 0;
      const rate = totalCount > 0 ? (returnedCount / totalCount) * 100 : 0;

      return {
        total: totalCount,
        returned: returnedCount,
        rate: Number(rate.toFixed(2))
      };
    } catch (error) {
      console.error('Error calculating return rate:', error);
      throw error;
    }
  }

  async getPopularCategories(): Promise<{ category: string; count: number }[]> {
    try {
      return await db.select({
        category: analytics.itemType,
        count: sql<number>`count(*)`
      })
        .from(analytics)
        .groupBy(analytics.itemType)
        .orderBy(sql`count(*) DESC`);
    } catch (error) {
      console.error('Error getting popular categories:', error);
      throw error;
    }
  }

  // System monitoring implementation
  async recordSystemMetric(metric: InsertSystemMetric): Promise<SystemMetric> {
    try {
      const [systemMetric] = await db.insert(systemMetrics).values(metric).returning();
      return systemMetric;
    } catch (error) {
      console.error('Error recording system metric:', error);
      throw error;
    }
  }

  async getSystemMetrics(type: string, startDate: Date, endDate: Date): Promise<SystemMetric[]> {
    try {
      return await db.select()
        .from(systemMetrics)
        .where(
          and(
            eq(systemMetrics.metricType, type),
            sql`${systemMetrics.timestamp} BETWEEN ${startDate} AND ${endDate}`
          )
        );
    } catch (error) {
      console.error('Error getting system metrics:', error);
      throw error;
    }
  }

  // User activity implementation
  async recordUserActivity(activity: InsertUserActivity): Promise<UserActivity> {
    try {
      const [userActivity] = await db.insert(userActivityLog).values(activity).returning();
      return userActivity;
    } catch (error) {
      console.error('Error recording user activity:', error);
      throw error;
    }
  }

  async getUserActivities(userId: number): Promise<UserActivity[]> {
    try {
      return await db.select()
        .from(userActivityLog)
        .where(eq(userActivityLog.userId, userId))
        .orderBy(desc(userActivityLog.timestamp));
    } catch (error) {
      console.error('Error getting user activities:', error);
      throw error;
    }
  }

  // API usage implementation
  async recordApiUsage(usage: InsertApiUsageMetric): Promise<ApiUsageMetric> {
    try {
      const [apiUsageMetric] = await db.insert(apiUsage).values(usage).returning();
      return apiUsageMetric;
    } catch (error) {
      console.error('Error recording API usage:', error);
      throw error;
    }
  }

  async getApiUsageStats(startDate: Date, endDate: Date): Promise<ApiUsageMetric[]> {
    try {
      return await db.select()
        .from(apiUsage)
        .where(sql`${apiUsage.timestamp} BETWEEN ${startDate} AND ${endDate}`)
        .orderBy(apiUsage.timestamp);
    } catch (error) {
      console.error('Error getting API usage stats:', error);
      throw error;
    }
  }

  // Security methods implementation
  async getIpAllowlist(): Promise<IpAllowlist[]> {
    try {
      return await db.select().from(ipAllowlist);
    } catch (error) {
      console.error('Error getting IP allowlist:', error);
      throw error;
    }
  }

  async addIpAllowlist(data: InsertIpAllowlist & { createdBy: number }): Promise<IpAllowlist> {
    try {
      const [entry] = await db.insert(ipAllowlist).values(data).returning();
      return entry;
    } catch (error) {
      console.error('Error adding to IP allowlist:', error);
      throw error;
    }
  }

  async logSecurityAudit(data: InsertSecurityAuditLog & { userId: number }): Promise<SecurityAuditLog> {
    try {
      const [log] = await db.insert(securityAuditLog).values({
        ...data,
        timestamp: new Date(),
      }).returning();
      return log;
    } catch (error) {
      console.error('Error logging security audit:', error);
      throw error;
    }
  }

  async getSecurityAuditLogs(): Promise<SecurityAuditLog[]> {
    try {
      return await db.select()
        .from(securityAuditLog)
        .orderBy(desc(securityAuditLog.timestamp));
    } catch (error) {
      console.error('Error getting security audit logs:', error);
      throw error;
    }
  }

  async getUserSessions(userId: number): Promise<{ id: string; userAgent: string; ipAddress: string; lastActivity: string }[]> {
    try {
      return await db.select({
        id: activeSessions.sessionId,
        userAgent: activeSessions.userAgent,
        ipAddress: activeSessions.ipAddress,
        lastActivity: activeSessions.lastActivity,
      })
        .from(activeSessions)
        .where(eq(activeSessions.userId, userId))
        .orderBy(desc(activeSessions.lastActivity));
    } catch (error) {
      console.error('Error getting user sessions:', error);
      throw error;
    }
  }

  async terminateSession(sessionId: string): Promise<void> {
    try {
      await db.delete(activeSessions).where(eq(activeSessions.sessionId, sessionId));
    } catch (error) {
      console.error('Error terminating session:', error);
      throw error;
    }
  }

  // Registered items implementation
  async createRegisteredItem(item: InsertRegisteredItem, userId: number): Promise<RegisteredItem> {
    try {
      console.log('Creating registered item:', item);

      const [registeredItem] = await db.insert(registeredItems).values({
        ...item,
        uniqueId: nanoid(10),
        ownerId: userId,
        status: 'ACTIVE',
        createdAt: new Date(),
      }).returning();

      // Update the corresponding document or device
      if (item.itemType === 'DOCUMENT') {
        await db.update(documents)
          .set({ 
            isRegistered: true,
            registeredItemId: registeredItem.id 
          })
          .where(eq(documents.id, item.itemId));
      } else {
        await db.update(devices)
          .set({ 
            isRegistered: true,
            registeredItemId: registeredItem.id 
          })
          .where(eq(devices.id, item.itemId));
      }

      console.log('Registered item created:', registeredItem);
      return registeredItem;
    } catch (error) {
      console.error('Error creating registered item:', error);
      throw error;
    }
  }

  async getRegisteredItem(id: number): Promise<RegisteredItem | undefined> {
    try {
      const [item] = await db.select()
        .from(registeredItems)
        .where(eq(registeredItems.id, id));
      return item;
    } catch (error) {
      console.error('Error getting registered item:', error);
      return undefined;
    }
  }

  async getRegisteredItemByOfficialId(officialId: string): Promise<RegisteredItem | undefined> {
    try {
      const [item] = await db.select()
        .from(registeredItems)
        .where(eq(registeredItems.officialId, officialId));
      return item;
    } catch (error) {
      console.error('Error getting registered item by official ID:', error);
      return undefined;
    }
  }

  async getUserRegisteredItems(userId: number): Promise<RegisteredItem[]> {
    try {
      return await db.select()
        .from(registeredItems)
        .where(eq(registeredItems.ownerId, userId))
        .orderBy(desc(registeredItems.createdAt));
    } catch (error) {
      console.error('Error getting user registered items:', error);
      throw error;
    }
  }

  async updateRegisteredItem(id: number, updates: Partial<RegisteredItem>): Promise<RegisteredItem> {
    try {
      const [item] = await db.update(registeredItems)
        .set({
          ...updates,
          updatedAt: new Date(),
        })
        .where(eq(registeredItems.id, id))
        .returning();
      return item;
    } catch (error) {
      console.error('Error updating registered item:', error);
      throw error;
    }
  }
}

export const storage = new DatabaseStorage();