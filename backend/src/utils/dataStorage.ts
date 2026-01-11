import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import type { UserData, ActivityData } from '../types/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const DATA_DIR = join(__dirname, '..', 'data');

// Ensure data directory exists
if (!existsSync(DATA_DIR)) {
  mkdirSync(DATA_DIR, { recursive: true });
}

const USERS_FILE = join(DATA_DIR, 'users.json');
const ACTIVITIES_FILE = join(DATA_DIR, 'activities.json');

export class DataStorage {
  // User data operations
  readUsers(): Record<string, UserData> {
    if (!existsSync(USERS_FILE)) {
      return {};
    }
    try {
      const content = readFileSync(USERS_FILE, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      console.error('Error reading users file:', error);
      return {};
    }
  }

  writeUsers(users: Record<string, UserData>): void {
    try {
      writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
    } catch (error) {
      console.error('Error writing users file:', error);
      throw error;
    }
  }

  getUser(userId: string): UserData | null {
    const users = this.readUsers();
    return users[userId] || null;
  }

  saveUser(userData: UserData): void {
    const users = this.readUsers();
    users[userData.userId] = userData;
    this.writeUsers(users);
  }

  // Activity data operations
  readActivities(): Record<string, ActivityData> {
    if (!existsSync(ACTIVITIES_FILE)) {
      return {};
    }
    try {
      const content = readFileSync(ACTIVITIES_FILE, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      console.error('Error reading activities file:', error);
      return {};
    }
  }

  writeActivities(activities: Record<string, ActivityData>): void {
    try {
      writeFileSync(ACTIVITIES_FILE, JSON.stringify(activities, null, 2));
    } catch (error) {
      console.error('Error writing activities file:', error);
      throw error;
    }
  }

  getActivities(userId: string): ActivityData | null {
    const activities = this.readActivities();
    return activities[userId] || null;
  }

  saveActivities(activityData: ActivityData): void {
    const activities = this.readActivities();
    activities[activityData.userId] = activityData;
    this.writeActivities(activities);
  }
}

