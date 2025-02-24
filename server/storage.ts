import { users, items, type User, type InsertUser, type Item, type InsertItem } from "@shared/schema";
import session from "express-session";
import createMemoryStore from "memorystore";
import { nanoid } from "nanoid";

const MemoryStore = createMemoryStore(session);

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
  
  sessionStore: session.Store;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private items: Map<number, Item>;
  private currentUserId: number;
  private currentItemId: number;
  sessionStore: session.Store;

  constructor() {
    this.users = new Map();
    this.items = new Map();
    this.currentUserId = 1;
    this.currentItemId = 1;
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000,
    });
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async createItem(item: InsertItem & { reportedBy: number }): Promise<Item> {
    const id = this.currentItemId++;
    const newItem: Item = {
      ...item,
      id,
      uniqueId: nanoid(10),
      reportedAt: new Date(),
    };
    this.items.set(id, newItem);
    return newItem;
  }

  async getItem(id: number): Promise<Item | undefined> {
    return this.items.get(id);
  }

  async getItemByUniqueId(uniqueId: string): Promise<Item | undefined> {
    return Array.from(this.items.values()).find(
      (item) => item.uniqueId === uniqueId,
    );
  }

  async updateItemStatus(id: number, status: Item["status"]): Promise<Item> {
    const item = this.items.get(id);
    if (!item) throw new Error("Item not found");
    
    const updatedItem = { ...item, status };
    this.items.set(id, updatedItem);
    return updatedItem;
  }

  async searchItems(query: string): Promise<Item[]> {
    const lowercaseQuery = query.toLowerCase();
    return Array.from(this.items.values()).filter(
      (item) =>
        item.name.toLowerCase().includes(lowercaseQuery) ||
        item.description.toLowerCase().includes(lowercaseQuery) ||
        item.uniqueId.toLowerCase() === lowercaseQuery
    );
  }

  async getUserItems(userId: number): Promise<Item[]> {
    return Array.from(this.items.values()).filter(
      (item) => item.reportedBy === userId
    );
  }
}

export const storage = new MemStorage();
