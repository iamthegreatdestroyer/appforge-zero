-- AppForge Zero Initial Database Schema
-- Migration: 001_initial_schema
-- Created: 2024

-- Templates table: stores all available app templates
CREATE TABLE IF NOT EXISTS templates (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('wallpaper-static', 'wallpaper-live', 'soundboard', 'quiz-app', 'watch-face', 'widget')),
    version TEXT NOT NULL DEFAULT '1.0.0',
    description TEXT,
    thumbnail_path TEXT,
    config_schema TEXT NOT NULL, -- JSON schema for morph configuration
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Generated Apps table: tracks all apps created from templates
CREATE TABLE IF NOT EXISTS apps (
    id TEXT PRIMARY KEY,
    template_id TEXT NOT NULL REFERENCES templates(id),
    name TEXT NOT NULL,
    package_name TEXT NOT NULL UNIQUE,
    version_code INTEGER NOT NULL DEFAULT 1,
    version_name TEXT NOT NULL DEFAULT '1.0.0',
    morph_config TEXT NOT NULL, -- JSON configuration used for morphing
    icon_path TEXT,
    status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft', 'building', 'ready', 'published', 'error')),
    build_path TEXT,
    error_message TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    built_at DATETIME
);

-- Assets table: tracks all assets (images, sounds, etc.)
CREATE TABLE IF NOT EXISTS assets (
    id TEXT PRIMARY KEY,
    app_id TEXT REFERENCES apps(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK(type IN ('icon', 'splash', 'wallpaper', 'sound', 'image', 'font')),
    name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_size INTEGER,
    mime_type TEXT,
    metadata TEXT, -- JSON for dimensions, duration, etc.
    source TEXT CHECK(source IN ('upload', 'generated', 'stock')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_apps_template ON apps(template_id);
CREATE INDEX IF NOT EXISTS idx_apps_status ON apps(status);
CREATE INDEX IF NOT EXISTS idx_assets_app ON assets(app_id);
CREATE INDEX IF NOT EXISTS idx_assets_type ON assets(type);

-- Trigger to update updated_at timestamp
CREATE TRIGGER IF NOT EXISTS update_templates_timestamp 
AFTER UPDATE ON templates
BEGIN
    UPDATE templates SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_apps_timestamp 
AFTER UPDATE ON apps
BEGIN
    UPDATE apps SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;
