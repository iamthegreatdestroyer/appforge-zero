-- AppForge Zero Distribution Database Schema
-- Migration: 003_distributions_schema
-- Tracks app distributions and store submissions

-- Distributions table: tracks where apps have been published
CREATE TABLE IF NOT EXISTS distributions (
    id TEXT PRIMARY KEY,
    app_id TEXT NOT NULL REFERENCES apps(id) ON DELETE CASCADE,
    store TEXT NOT NULL CHECK(store IN ('play_store', 'amazon', 'samsung', 'huawei', 'apkpure', 'direct')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'submitted', 'review', 'approved', 'rejected', 'published', 'suspended')),
    store_app_id TEXT, -- The ID assigned by the store
    store_url TEXT,
    submission_date DATETIME,
    approval_date DATETIME,
    rejection_reason TEXT,
    metadata TEXT, -- JSON for store-specific data
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Distribution Stats: tracks downloads and revenue
CREATE TABLE IF NOT EXISTS distribution_stats (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    distribution_id TEXT NOT NULL REFERENCES distributions(id) ON DELETE CASCADE,
    downloads INTEGER DEFAULT 0,
    active_installs INTEGER DEFAULT 0,
    revenue REAL DEFAULT 0.0,
    currency TEXT DEFAULT 'USD',
    rating REAL,
    review_count INTEGER DEFAULT 0,
    crash_rate REAL,
    recorded_date DATE NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(distribution_id, recorded_date)
);

-- Revenue Transactions: individual revenue entries
CREATE TABLE IF NOT EXISTS revenue_transactions (
    id TEXT PRIMARY KEY,
    distribution_id TEXT NOT NULL REFERENCES distributions(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK(type IN ('ad_revenue', 'iap', 'subscription', 'paid_download')),
    amount REAL NOT NULL,
    currency TEXT NOT NULL DEFAULT 'USD',
    transaction_date DATETIME NOT NULL,
    external_id TEXT, -- ID from ad network or store
    metadata TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_distributions_app ON distributions(app_id);
CREATE INDEX IF NOT EXISTS idx_distributions_store ON distributions(store);
CREATE INDEX IF NOT EXISTS idx_distributions_status ON distributions(status);
CREATE INDEX IF NOT EXISTS idx_stats_distribution ON distribution_stats(distribution_id);
CREATE INDEX IF NOT EXISTS idx_stats_date ON distribution_stats(recorded_date);
CREATE INDEX IF NOT EXISTS idx_revenue_distribution ON revenue_transactions(distribution_id);
CREATE INDEX IF NOT EXISTS idx_revenue_date ON revenue_transactions(transaction_date);

-- Update trigger
CREATE TRIGGER IF NOT EXISTS update_distributions_timestamp 
AFTER UPDATE ON distributions
BEGIN
    UPDATE distributions SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- View for aggregate revenue
CREATE VIEW IF NOT EXISTS v_app_revenue AS
SELECT 
    a.id as app_id,
    a.name as app_name,
    d.store,
    SUM(rt.amount) as total_revenue,
    COUNT(rt.id) as transaction_count
FROM apps a
JOIN distributions d ON a.id = d.app_id
JOIN revenue_transactions rt ON d.id = rt.distribution_id
GROUP BY a.id, d.store;
