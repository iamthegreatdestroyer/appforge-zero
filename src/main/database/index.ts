/**
 * Database Layer Entry Point
 *
 * Exports all database functionality
 */

// Types
export * from "./types";

// Database implementations
export { SQLiteDatabase } from "./sqlite";

// Schema definitions
export * from "./schema";

// Repositories
export {
  BaseRepository,
  TemplateRepository,
  BuildJobRepository,
  TrendRepository,
  PublishedAppRepository,
  SalesMetricsRepository,
} from "./repositories";

// Database manager
export { DatabaseManager, getDatabaseManager } from "./manager";
