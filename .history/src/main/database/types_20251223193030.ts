/**
 * Database Layer Type Definitions
 *
 * Provides SQLite/PostgreSQL abstraction, query builders,
 * schema definitions, and migration types.
 */

/**
 * Supported database types
 */
export enum DatabaseType {
  SQLITE = 'sqlite',
  POSTGRESQL = 'postgresql'
}

/**
 * Database configuration
 */
export interface DatabaseConfig {
  type: DatabaseType;
  path?: string; // For SQLite
  host?: string; // For PostgreSQL
  port?: number; // For PostgreSQL
  database: string;
  username?: string; // For PostgreSQL
  password?: string; // For PostgreSQL
  logging?: boolean;
  migrations?: string[];
}

/**
 * Query result
 */
export interface QueryResult<T = any> {
  rows: T[];
  count: number;
  lastId?: number;
  changes?: number;
}

/**
 * Where clause conditions
 */
export interface WhereCondition {
  [key: string]: any;
}

/**
 * Query options
 */
export interface QueryOptions {
  limit?: number;
  offset?: number;
  orderBy?: string;
  ascending?: boolean;
}

/**
 * Database query builder
 */
export interface QueryBuilder<T = any> {
  select(columns?: string[]): QueryBuilder<T>;
  from(table: string): QueryBuilder<T>;
  where(conditions: WhereCondition): QueryBuilder<T>;
  join(table: string, on: string): QueryBuilder<T>;
  orderBy(column: string, ascending?: boolean): QueryBuilder<T>;
  limit(count: number): QueryBuilder<T>;
  offset(count: number): QueryBuilder<T>;
  execute(): Promise<QueryResult<T>>;
  sql(): string;
}

/**
 * Insert builder
 */
export interface InsertBuilder<T = any> {
  into(table: string): InsertBuilder<T>;
  values(data: Partial<T>): InsertBuilder<T>;
  execute(): Promise<QueryResult>;
  sql(): string;
}

/**
 * Update builder
 */
export interface UpdateBuilder<T = any> {
  table(name: string): UpdateBuilder<T>;
  set(data: Partial<T>): UpdateBuilder<T>;
  where(conditions: WhereCondition): UpdateBuilder<T>;
  execute(): Promise<QueryResult>;
  sql(): string;
}

/**
 * Delete builder
 */
export interface DeleteBuilder {
  from(table: string): DeleteBuilder;
  where(conditions: WhereCondition): DeleteBuilder;
  execute(): Promise<QueryResult>;
  sql(): string;
}

/**
 * Database connection interface
 */
export interface Database {
  query<T = any>(sql: string, params?: any[]): Promise<QueryResult<T>>;
  execute(sql: string, params?: any[]): Promise<QueryResult>;
  transaction<T>(callback: (db: Database) => Promise<T>): Promise<T>;
  close(): Promise<void>;
  select<T = any>(): QueryBuilder<T>;
  insert<T = any>(): InsertBuilder<T>;
  update<T = any>(): UpdateBuilder<T>;
  delete(): DeleteBuilder;
  migrate(): Promise<void>;
}

/**
 * Schema definition for a table
 */
export interface TableSchema {
  name: string;
  columns: ColumnDefinition[];
  primaryKey?: string;
  indexes?: IndexDefinition[];
  foreignKeys?: ForeignKeyDefinition[];
}

/**
 * Column definition
 */
export interface ColumnDefinition {
  name: string;
  type: 'INTEGER' | 'TEXT' | 'REAL' | 'BLOB' | 'BOOLEAN' | 'TIMESTAMP';
  nullable?: boolean;
  default?: any;
  autoIncrement?: boolean;
  unique?: boolean;
}

/**
 * Index definition
 */
export interface IndexDefinition {
  name: string;
  columns: string[];
  unique?: boolean;
}

/**
 * Foreign key definition
 */
export interface ForeignKeyDefinition {
  column: string;
  references: {
    table: string;
    column: string;
  };
  onDelete?: 'CASCADE' | 'SET NULL' | 'RESTRICT';
}

/**
 * Migration interface
 */
export interface Migration {
  name: string;
  up(db: Database): Promise<void>;
  down(db: Database): Promise<void>;
}

/**
 * Cache entry
 */
export interface CacheEntry<T = any> {
  key: string;
  value: T;
  ttl?: number;
  createdAt: number;
}

/**
 * Cache configuration
 */
export interface CacheConfig {
  maxSize: number; // Max entries
  defaultTTL?: number; // ms
  evictionPolicy?: 'LRU' | 'LFU' | 'FIFO';
}

/**
 * Repository pattern interface
 */
export interface Repository<T> {
  findById(id: any): Promise<T | null>;
  findAll(options?: QueryOptions): Promise<T[]>;
  findWhere(conditions: WhereCondition, options?: QueryOptions): Promise<T[]>;
  create(data: Partial<T>): Promise<T>;
  update(id: any, data: Partial<T>): Promise<T>;
  delete(id: any): Promise<boolean>;
  count(conditions?: WhereCondition): Promise<number>;
}

/**
 * Transaction context
 */
export interface TransactionContext {
  isActive: boolean;
  rollback(): Promise<void>;
  commit(): Promise<void>;
}

/**
 * Database statistics for monitoring
 */
export interface DatabaseStats {
  queriesExecuted: number;
  totalExecutionTime: number;
  cacheHits: number;
  cacheMisses: number;
  transactionsCommitted: number;
  transactionsRolledBack: number;
}
