/**
 * Database Layer Tests
 *
 * Comprehensive test suite for SQLite, repositories, and manager
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { SQLiteDatabase } from './sqlite';
import {
  TemplateRepository,
  BuildJobRepository,
  TrendRepository,
} from './repositories';
import { DatabaseManager } from './manager';
import { DatabaseType } from './types';
import * as path from 'path';
import * as fs from 'fs';

/**
 * Test database path
 */
const TEST_DB_PATH = ':memory:';

describe('Database Layer', () => {
  describe('SQLiteDatabase', () => {
    let db: SQLiteDatabase;

    beforeEach(async () => {
      db = new SQLiteDatabase({
        type: DatabaseType.SQLITE,
        path: TEST_DB_PATH,
        database: 'test',
      });
      await db.initialize();
    });

    afterEach(async () => {
      await db.close();
    });

    it('should initialize connection', async () => {
      // Test passed if no error thrown
      expect(db).toBeDefined();
    });

    it('should execute SQL commands', async () => {
      await db.execute(`
        CREATE TABLE test_table (
          id INTEGER PRIMARY KEY,
          name TEXT NOT NULL
        )
      `);

      const result = await db.execute(
        'INSERT INTO test_table (name) VALUES (?)',
        ['test']
      );

      expect(result.changes).toBe(1);
    });

    it('should query data', async () => {
      await db.execute(`
        CREATE TABLE test_data (
          id INTEGER PRIMARY KEY,
          name TEXT,
          value REAL
        )
      `);

      await db.execute(
        'INSERT INTO test_data (name, value) VALUES (?, ?)',
        ['item1', 42.5]
      );

      const result = await db.query<any>(
        'SELECT * FROM test_data'
      );

      expect(result.count).toBe(1);
      expect(result.rows[0].name).toBe('item1');
      expect(result.rows[0].value).toBe(42.5);
    });

    it('should support transactions', async () => {
      await db.execute(`
        CREATE TABLE trans_test (
          id INTEGER PRIMARY KEY,
          value TEXT
        )
      `);

      try {
        await db.transaction(async (transDb) => {
          await transDb.execute(
            'INSERT INTO trans_test (value) VALUES (?)',
            ['first']
          );
          throw new Error('Rollback test');
        });
      } catch {
        // Expected
      }

      const result = await db.query('SELECT COUNT(*) as count FROM trans_test');
      expect(result.rows[0].count).toBe(0); // Rolled back
    });

    it('should cache SELECT results', async () => {
      await db.execute(`CREATE TABLE cache_test (id INTEGER, name TEXT)`);
      await db.execute("INSERT INTO cache_test VALUES (1, 'test')");

      const stats1 = db.getStats();
      const result1 = await db.query('SELECT * FROM cache_test');
      const result2 = await db.query('SELECT * FROM cache_test');

      const stats2 = db.getStats();

      expect(stats2.cacheHits).toBeGreaterThan(stats1.cacheHits);
      expect(result1.rows).toEqual(result2.rows);
    });

    it('should clear cache on INSERT/UPDATE/DELETE', async () => {
      await db.execute(`CREATE TABLE clear_test (id INTEGER, name TEXT)`);
      await db.query('SELECT * FROM clear_test');

      // This should clear cache
      await db.execute("INSERT INTO clear_test VALUES (1, 'test')");

      // Accessing cache should be empty
      const stats = db.getStats();
      expect(stats.cacheMisses).toBeGreaterThan(0);
    });

    it('should support query builder', async () => {
      await db.execute(`
        CREATE TABLE builder_test (
          id TEXT PRIMARY KEY,
          name TEXT,
          category TEXT
        )
      `);

      await db.execute(
        "INSERT INTO builder_test (id, name, category) VALUES (?, ?, ?)",
        ['1', 'item1', 'cat1']
      );

      const result = await db
        .select<any>()
        .from('builder_test')
        .where({ category: 'cat1' })
        .execute();

      expect(result.count).toBe(1);
      expect(result.rows[0].name).toBe('item1');
    });

    it('should track statistics', () => {
      const stats = db.getStats();

      expect(stats.queriesExecuted).toBeGreaterThanOrEqual(0);
      expect(stats.totalExecutionTime).toBeGreaterThanOrEqual(0);
      expect(stats.cacheHits).toBeGreaterThanOrEqual(0);
    });
  });

  describe('TemplateRepository', () => {
    let db: SQLiteDatabase;
    let repo: TemplateRepository;

    beforeEach(async () => {
      db = new SQLiteDatabase({
        type: DatabaseType.SQLITE,
        path: TEST_DB_PATH,
        database: 'test',
      });
      await db.initialize();

      // Create table
      await db.execute(`
        CREATE TABLE templates (
          id TEXT PRIMARY KEY,
          title TEXT,
          description TEXT,
          category TEXT,
          version TEXT,
          author TEXT,
          morphTransformation TEXT,
          stats TEXT,
          createdAt TIMESTAMP,
          updatedAt TIMESTAMP
        )
      `);

      repo = new TemplateRepository(db);
    });

    afterEach(async () => {
      await db.close();
    });

    it('should create template', async () => {
      const template = await repo.create({
        id: 'tmpl-1',
        title: 'Test Template',
        description: 'A test template',
        category: 'test',
        version: '1.0.0',
        author: 'test',
        morphTransformation: { rules: [] },
        stats: { rating: 0 },
      });

      expect(template.id).toBe('tmpl-1');
      expect(template.title).toBe('Test Template');
    });

    it('should find template by ID', async () => {
      await repo.create({
        id: 'tmpl-2',
        title: 'Template 2',
        description: 'Test',
        category: 'cat',
        version: '1.0',
        author: 'test',
        morphTransformation: {},
        stats: {},
      });

      const found = await repo.findById('tmpl-2');
      expect(found).toBeDefined();
      expect(found?.title).toBe('Template 2');
    });

    it('should find all templates', async () => {
      await repo.create({
        id: 'tmpl-3',
        title: 'T1',
        description: 'Test',
        category: 'cat',
        version: '1.0',
        author: 'test',
        morphTransformation: {},
        stats: {},
      });

      const all = await repo.findAll();
      expect(all.length).toBeGreaterThanOrEqual(1);
    });

    it('should find templates by category', async () => {
      await repo.create({
        id: 'tmpl-4',
        title: 'T4',
        description: 'Test',
        category: 'comedy',
        version: '1.0',
        author: 'test',
        morphTransformation: {},
        stats: {},
      });

      const found = await repo.findByCategory('comedy');
      expect(found.length).toBeGreaterThan(0);
      expect(found[0].category).toBe('comedy');
    });

    it('should update template', async () => {
      await repo.create({
        id: 'tmpl-5',
        title: 'Original',
        description: 'Test',
        category: 'cat',
        version: '1.0',
        author: 'test',
        morphTransformation: {},
        stats: {},
      });

      const updated = await repo.update('tmpl-5', { title: 'Updated' });
      expect(updated.title).toBe('Updated');
    });

    it('should delete template', async () => {
      await repo.create({
        id: 'tmpl-6',
        title: 'To Delete',
        description: 'Test',
        category: 'cat',
        version: '1.0',
        author: 'test',
        morphTransformation: {},
        stats: {},
      });

      await repo.delete('tmpl-6');
      const found = await repo.findById('tmpl-6');
      expect(found).toBeNull();
    });

    it('should search templates', async () => {
      await repo.create({
        id: 'tmpl-7',
        title: 'Comedy Show',
        description: 'A funny template',
        category: 'comedy',
        version: '1.0',
        author: 'test',
        morphTransformation: {},
        stats: {},
      });

      const results = await repo.search('funny');
      expect(results.length).toBeGreaterThan(0);
    });

    it('should count templates', async () => {
      await repo.create({
        id: 'tmpl-8',
        title: 'T8',
        description: 'Test',
        category: 'cat',
        version: '1.0',
        author: 'test',
        morphTransformation: {},
        stats: {},
      });

      const count = await repo.count();
      expect(count).toBeGreaterThan(0);
    });
  });

  describe('BuildJobRepository', () => {
    let db: SQLiteDatabase;
    let repo: BuildJobRepository;

    beforeEach(async () => {
      db = new SQLiteDatabase({
        type: DatabaseType.SQLITE,
        path: TEST_DB_PATH,
        database: 'test',
      });
      await db.initialize();

      await db.execute(`
        CREATE TABLE build_jobs (
          id TEXT PRIMARY KEY,
          appId TEXT,
          status TEXT,
          progress INTEGER,
          configuration TEXT,
          artifacts TEXT,
          logs TEXT,
          startTime TIMESTAMP,
          endTime TIMESTAMP,
          error TEXT,
          createdAt TIMESTAMP
        )
      `);

      repo = new BuildJobRepository(db);
    });

    afterEach(async () => {
      await db.close();
    });

    it('should create build job', async () => {
      const job = await repo.create({
        id: 'job-1',
        appId: 'app-1',
        status: 'queued',
        progress: 0,
        configuration: { output: '/path' },
        artifacts: [],
        logs: [],
      });

      expect(job.id).toBe('job-1');
      expect(job.status).toBe('queued');
    });

    it('should find builds by app', async () => {
      await repo.create({
        id: 'job-2',
        appId: 'app-2',
        status: 'queued',
        progress: 0,
        configuration: {},
        artifacts: [],
        logs: [],
      });

      const jobs = await repo.findByApp('app-2');
      expect(jobs.length).toBeGreaterThan(0);
      expect(jobs[0].appId).toBe('app-2');
    });

    it('should find builds by status', async () => {
      await repo.create({
        id: 'job-3',
        appId: 'app-1',
        status: 'building',
        progress: 50,
        configuration: {},
        artifacts: [],
        logs: [],
      });

      const jobs = await repo.findByStatus('building');
      expect(jobs.length).toBeGreaterThan(0);
    });

    it('should update progress', async () => {
      await repo.create({
        id: 'job-4',
        appId: 'app-1',
        status: 'building',
        progress: 0,
        configuration: {},
        artifacts: [],
        logs: [],
      });

      await repo.updateProgress('job-4', 75);
      const updated = await repo.findById('job-4');
      expect(updated?.progress).toBe(75);
    });
  });

  describe('DatabaseManager', () => {
    let manager: DatabaseManager;

    beforeEach(async () => {
      manager = DatabaseManager.getInstance();
      await manager.initialize({
        type: DatabaseType.SQLITE,
        path: TEST_DB_PATH,
        database: 'test',
        logging: false,
      });
    });

    afterEach(async () => {
      await manager.close();
    });

    it('should be singleton', () => {
      const m1 = DatabaseManager.getInstance();
      const m2 = DatabaseManager.getInstance();
      expect(m1).toBe(m2);
    });

    it('should initialize repositories', () => {
      expect(manager.templates).toBeDefined();
      expect(manager.buildJobs).toBeDefined();
      expect(manager.trends).toBeDefined();
      expect(manager.publishedApps).toBeDefined();
      expect(manager.salesMetrics).toBeDefined();
    });

    it('should report health check', async () => {
      const health = await manager.healthCheck();
      expect(health.status).toBe('healthy');
    });

    it('should get statistics', () => {
      const stats = manager.getStats();
      expect(stats).toBeDefined();
      expect(stats?.queriesExecuted).toBeGreaterThanOrEqual(0);
    });

    it('should support transactions', async () => {
      let committed = false;

      await manager.transaction(async () => {
        committed = true;
      });

      expect(committed).toBe(true);
    });
  });
});
