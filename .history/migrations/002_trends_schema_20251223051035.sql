-- AppForge Zero Trends Database Schema
-- Migration: 002_trends_schema
-- Tracks market trends and keyword analytics

-- Trends table: stores trend data from various sources
CREATE TABLE IF NOT EXISTS trends (
    id TEXT PRIMARY KEY,
    keyword TEXT NOT NULL,
    source TEXT NOT NULL CHECK(source IN ('google_trends', 'reddit', 'play_store', 'manual')),
    score REAL NOT NULL DEFAULT 0.0, -- Normalized 0-100 score
    volume INTEGER, -- Search volume or post count
    growth_rate REAL, -- Percentage change
    category TEXT,
    region TEXT DEFAULT 'US',
    data TEXT, -- JSON for additional trend data
    fetched_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME
);

-- Trend History: tracks trend changes over time
CREATE TABLE IF NOT EXISTS trend_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    trend_id TEXT NOT NULL REFERENCES trends(id) ON DELETE CASCADE,
    score REAL NOT NULL,
    volume INTEGER,
    recorded_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Keyword Suggestions: AI-generated keyword ideas
CREATE TABLE IF NOT EXISTS keyword_suggestions (
    id TEXT PRIMARY KEY,
    base_keyword TEXT NOT NULL,
    suggested_keyword TEXT NOT NULL,
    relevance_score REAL NOT NULL DEFAULT 0.0,
    competition_level TEXT CHECK(competition_level IN ('low', 'medium', 'high')),
    estimated_searches INTEGER,
    suggested_template_type TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_trends_keyword ON trends(keyword);
CREATE INDEX IF NOT EXISTS idx_trends_source ON trends(source);
CREATE INDEX IF NOT EXISTS idx_trends_score ON trends(score DESC);
CREATE INDEX IF NOT EXISTS idx_trend_history_trend ON trend_history(trend_id);
CREATE INDEX IF NOT EXISTS idx_suggestions_base ON keyword_suggestions(base_keyword);

-- Full-text search for keywords
CREATE VIRTUAL TABLE IF NOT EXISTS trends_fts USING fts5(
    keyword,
    category,
    content='trends',
    content_rowid='rowid'
);

-- Triggers to keep FTS in sync
CREATE TRIGGER IF NOT EXISTS trends_ai AFTER INSERT ON trends BEGIN
    INSERT INTO trends_fts(rowid, keyword, category) VALUES (NEW.rowid, NEW.keyword, NEW.category);
END;

CREATE TRIGGER IF NOT EXISTS trends_ad AFTER DELETE ON trends BEGIN
    INSERT INTO trends_fts(trends_fts, rowid, keyword, category) VALUES('delete', OLD.rowid, OLD.keyword, OLD.category);
END;
