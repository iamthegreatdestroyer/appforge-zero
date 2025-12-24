/**
 * Phase 7: Authentication & Authorization Database Schema
 *
 * Tables for:
 * - User accounts and profiles
 * - JWT and refresh tokens
 * - Sessions and MFA
 * - RBAC policies and audit logs
 */

/**
 * SQL migration for users table
 */
export const migration_users = `
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  username TEXT UNIQUE NOT NULL,
  display_name TEXT,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user',
  permissions TEXT, -- Comma-separated
  profile_image_url TEXT,
  is_email_verified BOOLEAN DEFAULT 0,
  is_active BOOLEAN DEFAULT 1,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  last_login_at DATETIME,
  metadata TEXT -- JSON
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_role ON users(role);
`;

/**
 * SQL migration for refresh tokens table
 */
export const migration_refresh_tokens = `
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  token TEXT UNIQUE NOT NULL,
  expires_at DATETIME NOT NULL,
  created_at DATETIME NOT NULL,
  revoked_at DATETIME,
  rotation_count INTEGER DEFAULT 0,
  device_id TEXT,
  ip_address TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_expires_at ON refresh_tokens(expires_at);
CREATE INDEX idx_refresh_tokens_revoked_at ON refresh_tokens(revoked_at);
`;

/**
 * SQL migration for sessions table
 */
export const migration_sessions = `
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  expires_at DATETIME NOT NULL,
  created_at DATETIME NOT NULL,
  user_agent TEXT,
  ip_address TEXT,
  device_id TEXT,
  is_active BOOLEAN DEFAULT 1,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_expires_at ON sessions(expires_at);
CREATE INDEX idx_sessions_is_active ON sessions(is_active);
`;

/**
 * SQL migration for email verification tokens
 */
export const migration_email_verification_tokens = `
CREATE TABLE IF NOT EXISTS email_verification_tokens (
  user_id TEXT NOT NULL,
  token TEXT PRIMARY KEY,
  expires_at DATETIME NOT NULL,
  created_at DATETIME NOT NULL,
  used_at DATETIME,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX idx_email_tokens_user_id ON email_verification_tokens(user_id);
CREATE INDEX idx_email_tokens_expires_at ON email_verification_tokens(expires_at);
`;

/**
 * SQL migration for password reset tokens
 */
export const migration_password_reset_tokens = `
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  user_id TEXT NOT NULL,
  token TEXT PRIMARY KEY,
  expires_at DATETIME NOT NULL,
  created_at DATETIME NOT NULL,
  used_at DATETIME,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX idx_password_tokens_user_id ON password_reset_tokens(user_id);
CREATE INDEX idx_password_tokens_expires_at ON password_reset_tokens(expires_at);
`;

/**
 * SQL migration for MFA configs
 */
export const migration_mfa_configs = `
CREATE TABLE IF NOT EXISTS mfa_configs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  method TEXT NOT NULL, -- email, totp, sms
  secret TEXT, -- For TOTP
  backup_codes TEXT, -- Comma-separated
  enabled BOOLEAN DEFAULT 0,
  created_at DATETIME NOT NULL,
  verified_at DATETIME,
  FOREIGN KEY (user_id) REFERENCES users(id),
  UNIQUE(user_id, method)
);

CREATE INDEX idx_mfa_configs_user_id ON mfa_configs(user_id);
CREATE INDEX idx_mfa_configs_enabled ON mfa_configs(enabled);
`;

/**
 * SQL migration for MFA sessions
 */
export const migration_mfa_sessions = `
CREATE TABLE IF NOT EXISTS mfa_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  expires_at DATETIME NOT NULL,
  created_at DATETIME NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX idx_mfa_sessions_user_id ON mfa_sessions(user_id);
CREATE INDEX idx_mfa_sessions_expires_at ON mfa_sessions(expires_at);
`;

/**
 * SQL migration for RBAC policies
 */
export const migration_rbac_policies = `
CREATE TABLE IF NOT EXISTS rbac_policies (
  id TEXT PRIMARY KEY,
  role TEXT NOT NULL,
  resource TEXT NOT NULL,
  action TEXT NOT NULL,
  allowed BOOLEAN NOT NULL,
  conditions TEXT, -- JSON
  created_at DATETIME NOT NULL
);

CREATE INDEX idx_rbac_policies_role ON rbac_policies(role);
CREATE INDEX idx_rbac_policies_resource ON rbac_policies(resource);
CREATE UNIQUE INDEX idx_rbac_policies_unique ON rbac_policies(role, resource, action);
`;

/**
 * SQL migration for audit logs
 */
export const migration_audit_logs = `
CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  action TEXT NOT NULL,
  resource TEXT NOT NULL,
  resource_id TEXT,
  changes TEXT, -- JSON
  ip_address TEXT,
  user_agent TEXT,
  status TEXT NOT NULL, -- success, failure
  error TEXT,
  timestamp DATETIME NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_resource ON audit_logs(resource);
CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp);
CREATE INDEX idx_audit_logs_status ON audit_logs(status);
`;

/**
 * SQL migration for login attempts (rate limiting)
 */
export const migration_login_attempts = `
CREATE TABLE IF NOT EXISTS login_attempts (
  id TEXT PRIMARY KEY,
  email TEXT,
  username TEXT,
  ip_address TEXT NOT NULL,
  success BOOLEAN NOT NULL,
  timestamp DATETIME NOT NULL
);

CREATE INDEX idx_login_attempts_email ON login_attempts(email);
CREATE INDEX idx_login_attempts_username ON login_attempts(username);
CREATE INDEX idx_login_attempts_ip_address ON login_attempts(ip_address);
CREATE INDEX idx_login_attempts_timestamp ON login_attempts(timestamp);
`;

/**
 * SQL migration for API keys
 */
export const migration_api_keys = `
CREATE TABLE IF NOT EXISTS api_keys (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  key TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  permissions TEXT, -- Comma-separated
  rate_limit_requests_per_minute INTEGER,
  rate_limit_requests_per_day INTEGER,
  is_active BOOLEAN DEFAULT 1,
  created_at DATETIME NOT NULL,
  expires_at DATETIME,
  last_used_at DATETIME,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX idx_api_keys_user_id ON api_keys(user_id);
CREATE INDEX idx_api_keys_key ON api_keys(key);
CREATE INDEX idx_api_keys_is_active ON api_keys(is_active);
`;

/**
 * SQL migration for security events
 */
export const migration_security_events = `
CREATE TABLE IF NOT EXISTS security_events (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  type TEXT NOT NULL, -- login, logout, password_change, mfa_enable, suspicious_activity
  severity TEXT NOT NULL, -- info, warning, critical
  description TEXT NOT NULL,
  ip_address TEXT NOT NULL,
  timestamp DATETIME NOT NULL,
  resolved BOOLEAN DEFAULT 0,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX idx_security_events_user_id ON security_events(user_id);
CREATE INDEX idx_security_events_type ON security_events(type);
CREATE INDEX idx_security_events_severity ON security_events(severity);
CREATE INDEX idx_security_events_timestamp ON security_events(timestamp);
`;

/**
 * Combined migrations array
 */
export const allAuthMigrations = [
  migration_users,
  migration_refresh_tokens,
  migration_sessions,
  migration_email_verification_tokens,
  migration_password_reset_tokens,
  migration_mfa_configs,
  migration_mfa_sessions,
  migration_rbac_policies,
  migration_audit_logs,
  migration_login_attempts,
  migration_api_keys,
  migration_security_events,
];

/**
 * Apply all auth migrations
 */
export async function applyAuthMigrations(db: any): Promise<void> {
  for (const migration of allAuthMigrations) {
    await db.execute(migration);
  }
}
