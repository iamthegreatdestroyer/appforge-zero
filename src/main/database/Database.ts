/**
 * Database Service for AppForge Zero
 * Manages SQLite connection and migrations
 */

import Database from 'better-sqlite3';
import { existsSync, readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { app } from 'electron';

export class DatabaseService {
  private db: Database.Database;
  private readonly dbPath: string;
  private readonly migrationsPath: string;

  constructor() {
    const userDataPath = app.getPath('userData');
    this.dbPath = join(userDataPath, 'appforge.db');
    this.migrationsPath = join(__dirname, '../../migrations');
  }

  /**
   * Initialize database connection and run migrations
   */
  async initialize(): Promise<void> {
    this.db = new Database(this.dbPath);
    
    // Enable foreign keys and WAL mode for better performance
    this.db.pragma('foreign_keys = ON');
    this.db.pragma('journal_mode = WAL');
    
    // Run migrations
    await this.runMigrations();
  }

  /**
   * Run all pending database migrations
   */
  private async runMigrations(): Promise<void> {
    // Create migrations tracking table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS _migrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Get applied migrations
    const applied = this.db
      .prepare('SELECT name FROM _migrations')
      .all()
      .map((row: any) => row.name);

    // Get migration files
    if (!existsSync(this.migrationsPath)) {
      console.log('No migrations directory found');
      return;
    }

    const migrationFiles = readdirSync(this.migrationsPath)
      .filter(f => f.endsWith('.sql'))
      .sort();

    // Apply pending migrations
    for (const file of migrationFiles) {
      if (!applied.includes(file)) {
        console.log(`Applying migration: ${file}`);
        const sql = readFileSync(join(this.migrationsPath, file), 'utf-8');
        
        this.db.transaction(() => {
          this.db.exec(sql);
          this.db.prepare('INSERT INTO _migrations (name) VALUES (?)').run(file);
        })();
        
        console.log(`Migration applied: ${file}`);
      }
    }
  }

  /**
   * Get database instance for queries
   */
  getDb(): Database.Database {
    return this.db;
  }

  /**
   * Close database connection
   */
  close(): void {
    if (this.db) {
      this.db.close();
    }
  }

  /**
   * Execute a query and return all results
   */
  query<T>(sql: string, params: any[] = []): T[] {
    return this.db.prepare(sql).all(...params) as T[];
  }

  /**
   * Execute a query and return first result
   */
  queryOne<T>(sql: string, params: any[] = []): T | undefined {
    return this.db.prepare(sql).get(...params) as T | undefined;
  }

  /**
   * Execute an insert/update/delete and return changes
   */
  execute(sql: string, params: any[] = []): Database.RunResult {
    return this.db.prepare(sql).run(...params);
  }

  /**
   * Run multiple statements in a transaction
   */
  transaction<T>(fn: () => T): T {
    return this.db.transaction(fn)();
  }
}

// Singleton instance
let dbService: DatabaseService | null = null;

export function getDatabase(): DatabaseService {
  if (!dbService) {
    dbService = new DatabaseService();
  }
  return dbService;
}

export default DatabaseService;
