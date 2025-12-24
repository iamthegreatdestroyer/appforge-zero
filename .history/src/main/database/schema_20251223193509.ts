/**
 * Database Schema Definitions
 *
 * Defines all tables, columns, indexes, and constraints
 * for AppForge Zero data persistence
 */

import { TableSchema } from './types';

/**
 * Templates table schema
 */
export const TemplatesSchema: TableSchema = {
  name: 'templates',
  columns: [
    {
      name: 'id',
      type: 'TEXT',
      primaryKey: true,
      unique: true,
    },
    {
      name: 'title',
      type: 'TEXT',
      nullable: false,
    },
    {
      name: 'description',
      type: 'TEXT',
      nullable: false,
    },
    {
      name: 'category',
      type: 'TEXT',
      nullable: false,
    },
    {
      name: 'version',
      type: 'TEXT',
      default: '1.0.0',
    },
    {
      name: 'author',
      type: 'TEXT',
    },
    {
      name: 'morphTransformation',
      type: 'TEXT', // JSON string
      nullable: false,
    },
    {
      name: 'stats',
      type: 'TEXT', // JSON string
      default: '{"downloads":0,"rating":0,"reviews":0}',
    },
    {
      name: 'createdAt',
      type: 'TIMESTAMP',
      default: 'CURRENT_TIMESTAMP',
    },
    {
      name: 'updatedAt',
      type: 'TIMESTAMP',
      default: 'CURRENT_TIMESTAMP',
    },
  ],
  primaryKey: 'id',
  indexes: [
    {
      name: 'idx_templates_category',
      columns: ['category'],
    },
    {
      name: 'idx_templates_createdAt',
      columns: ['createdAt'],
    },
  ],
};

/**
 * Build jobs table schema
 */
export const BuildJobsSchema: TableSchema = {
  name: 'build_jobs',
  columns: [
    {
      name: 'id',
      type: 'TEXT',
      primaryKey: true,
      unique: true,
    },
    {
      name: 'appId',
      type: 'TEXT',
      nullable: false,
    },
    {
      name: 'status',
      type: 'TEXT',
      default: 'queued',
    },
    {
      name: 'progress',
      type: 'INTEGER',
      default: 0,
    },
    {
      name: 'configuration',
      type: 'TEXT', // JSON string
      nullable: false,
    },
    {
      name: 'artifacts',
      type: 'TEXT', // JSON array
      default: '[]',
    },
    {
      name: 'logs',
      type: 'TEXT', // JSON array
      default: '[]',
    },
    {
      name: 'startTime',
      type: 'TIMESTAMP',
    },
    {
      name: 'endTime',
      type: 'TIMESTAMP',
    },
    {
      name: 'error',
      type: 'TEXT', // JSON object if error
    },
    {
      name: 'createdAt',
      type: 'TIMESTAMP',
      default: 'CURRENT_TIMESTAMP',
    },
  ],
  primaryKey: 'id',
  indexes: [
    {
      name: 'idx_builds_appId',
      columns: ['appId'],
    },
    {
      name: 'idx_builds_status',
      columns: ['status'],
    },
  ],
};

/**
 * Trends table schema
 */
export const TrendsSchema: TableSchema = {
  name: 'trends',
  columns: [
    {
      name: 'id',
      type: 'TEXT',
      primaryKey: true,
      unique: true,
    },
    {
      name: 'keyword',
      type: 'TEXT',
      nullable: false,
    },
    {
      name: 'category',
      type: 'TEXT',
      nullable: false,
    },
    {
      name: 'source',
      type: 'TEXT',
      default: 'combined',
    },
    {
      name: 'metrics',
      type: 'TEXT', // JSON object
      nullable: false,
    },
    {
      name: 'analysis',
      type: 'TEXT', // JSON object if analyzed
    },
    {
      name: 'archived',
      type: 'BOOLEAN',
      default: 0,
    },
    {
      name: 'discoveredAt',
      type: 'TIMESTAMP',
      default: 'CURRENT_TIMESTAMP',
    },
    {
      name: 'archivedAt',
      type: 'TIMESTAMP',
    },
  ],
  primaryKey: 'id',
  indexes: [
    {
      name: 'idx_trends_keyword',
      columns: ['keyword'],
    },
    {
      name: 'idx_trends_category',
      columns: ['category'],
    },
    {
      name: 'idx_trends_archived',
      columns: ['archived'],
    },
  ],
};

/**
 * Published apps table schema
 */
export const PublishedAppsSchema: TableSchema = {
  name: 'published_apps',
  columns: [
    {
      name: 'id',
      type: 'TEXT',
      primaryKey: true,
      unique: true,
    },
    {
      name: 'appId',
      type: 'TEXT',
      nullable: false,
    },
    {
      name: 'channel',
      type: 'TEXT',
      nullable: false,
    },
    {
      name: 'name',
      type: 'TEXT',
      nullable: false,
    },
    {
      name: 'version',
      type: 'TEXT',
      nullable: false,
    },
    {
      name: 'status',
      type: 'TEXT',
      default: 'draft',
    },
    {
      name: 'url',
      type: 'TEXT',
    },
    {
      name: 'revenue',
      type: 'REAL',
      default: 0,
    },
    {
      name: 'downloads',
      type: 'INTEGER',
      default: 0,
    },
    {
      name: 'publishDate',
      type: 'TIMESTAMP',
    },
    {
      name: 'createdAt',
      type: 'TIMESTAMP',
      default: 'CURRENT_TIMESTAMP',
    },
    {
      name: 'updatedAt',
      type: 'TIMESTAMP',
      default: 'CURRENT_TIMESTAMP',
    },
  ],
  primaryKey: 'id',
  indexes: [
    {
      name: 'idx_published_appId',
      columns: ['appId'],
    },
    {
      name: 'idx_published_channel',
      columns: ['channel'],
    },
    {
      name: 'idx_published_status',
      columns: ['status'],
    },
  ],
};

/**
 * Sales metrics table schema
 */
export const SalesMetricsSchema: TableSchema = {
  name: 'sales_metrics',
  columns: [
    {
      name: 'id',
      type: 'TEXT',
      primaryKey: true,
      unique: true,
    },
    {
      name: 'appId',
      type: 'TEXT',
      nullable: false,
    },
    {
      name: 'channel',
      type: 'TEXT',
      nullable: false,
    },
    {
      name: 'date',
      type: 'TIMESTAMP',
      nullable: false,
    },
    {
      name: 'revenue',
      type: 'REAL',
      default: 0,
    },
    {
      name: 'downloads',
      type: 'INTEGER',
      default: 0,
    },
    {
      name: 'purchases',
      type: 'INTEGER',
      default: 0,
    },
    {
      name: 'refunds',
      type: 'INTEGER',
      default: 0,
    },
  ],
  primaryKey: 'id',
  indexes: [
    {
      name: 'idx_sales_appId',
      columns: ['appId'],
    },
    {
      name: 'idx_sales_channel',
      columns: ['channel'],
    },
    {
      name: 'idx_sales_date',
      columns: ['date'],
    },
  ],
};

/**
 * Channel authentication table schema
 */
export const ChannelAuthSchema: TableSchema = {
  name: 'channel_auth',
  columns: [
    {
      name: 'id',
      type: 'TEXT',
      primaryKey: true,
      unique: true,
    },
    {
      name: 'channel',
      type: 'TEXT',
      nullable: false,
      unique: true,
    },
    {
      name: 'accessToken',
      type: 'TEXT',
      nullable: false,
    },
    {
      name: 'refreshToken',
      type: 'TEXT',
    },
    {
      name: 'tokenType',
      type: 'TEXT',
      default: 'Bearer',
    },
    {
      name: 'expiresAt',
      type: 'TIMESTAMP',
    },
    {
      name: 'createdAt',
      type: 'TIMESTAMP',
      default: 'CURRENT_TIMESTAMP',
    },
    {
      name: 'updatedAt',
      type: 'TIMESTAMP',
      default: 'CURRENT_TIMESTAMP',
    },
  ],
  primaryKey: 'id',
  indexes: [
    {
      name: 'idx_auth_channel',
      columns: ['channel'],
    },
  ],
};

/**
 * Database migrations table schema
 */
export const MigrationsSchema: TableSchema = {
  name: 'migrations',
  columns: [
    {
      name: 'name',
      type: 'TEXT',
      primaryKey: true,
      unique: true,
    },
    {
      name: 'executedAt',
      type: 'TIMESTAMP',
      default: 'CURRENT_TIMESTAMP',
    },
  ],
  primaryKey: 'name',
};

/**
 * Compile schema to SQL
 */
export function schemaToSQL(schema: TableSchema): string {
  const columnDefs = schema.columns
    .map((col) => {
      let def = `${col.name} ${col.type}`;

      if (col.primaryKey) def += ' PRIMARY KEY';
      if (col.autoIncrement) def += ' AUTOINCREMENT';
      if (!col.nullable && !col.primaryKey) def += ' NOT NULL';
      if (col.unique) def += ' UNIQUE';
      if (col.default !== undefined) {
        if (typeof col.default === 'string' && !col.default.includes('(')) {
          def += ` DEFAULT '${col.default}'`;
        } else {
          def += ` DEFAULT ${col.default}`;
        }
      }

      return def;
    })
    .join(',\n  ');

  return `CREATE TABLE IF NOT EXISTS ${schema.name} (\n  ${columnDefs}\n)`;
}

/**
 * All schemas
 */
export const AllSchemas = [
  TemplatesSchema,
  BuildJobsSchema,
  TrendsSchema,
  PublishedAppsSchema,
  SalesMetricsSchema,
  ChannelAuthSchema,
  MigrationsSchema,
];
