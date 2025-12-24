/**
 * Authorization & RBAC Service
 *
 * Handles:
 * - Role-based access control (RBAC)
 * - Permission checking
 * - Policy engine
 * - Audit logging
 */

import { DatabaseManager } from "../database";
import {
  User,
  Permission,
  UserRole,
  RoleDefinition,
  RBACPolicy,
  AuthorizationCheckResult,
  AuthorizationContext,
  AuditLogEntry,
} from "./types";
import * as crypto from "crypto";

/**
 * Default role definitions
 */
const DEFAULT_ROLES: Record<UserRole, RoleDefinition> = {
  admin: {
    role: "admin",
    name: "Administrator",
    description: "Full system access",
    permissions: [
      "template.create",
      "template.read",
      "template.update",
      "template.delete",
      "payment.process",
      "payment.refund",
      "trend.analyze",
      "build.create",
      "build.deploy",
      "user.read",
      "user.update",
      "user.delete",
      "analytics.view",
      "admin.access",
    ],
    isBuiltin: true,
    canBeModified: false,
  },
  creator: {
    role: "creator",
    name: "Content Creator",
    description: "Can create and manage templates",
    permissions: [
      "template.create",
      "template.read",
      "template.update",
      "template.delete",
      "build.create",
      "build.deploy",
      "analytics.view",
    ],
    isBuiltin: true,
    canBeModified: false,
  },
  moderator: {
    role: "moderator",
    name: "Moderator",
    description: "Can moderate content and users",
    permissions: [
      "template.read",
      "template.update",
      "user.read",
      "trend.analyze",
      "analytics.view",
    ],
    isBuiltin: true,
    canBeModified: false,
  },
  user: {
    role: "user",
    name: "User",
    description: "Regular user access",
    permissions: ["template.read", "analytics.view"],
    isBuiltin: true,
    canBeModified: false,
  },
  guest: {
    role: "guest",
    name: "Guest",
    description: "Limited public access",
    permissions: ["template.read"],
    isBuiltin: true,
    canBeModified: false,
  },
};

/**
 * Authorization service
 */
export class AuthorizationService {
  private db: DatabaseManager;
  private policies: Map<string, RBACPolicy> = new Map();
  private roles: Map<UserRole, RoleDefinition>;

  constructor(db: DatabaseManager) {
    this.db = db;
    this.roles = new Map(Object.entries(DEFAULT_ROLES));
  }

  /**
   * Check if user has permission
   */
  async hasPermission(
    user: User,
    permission: Permission,
    context?: Record<string, any>
  ): Promise<boolean> {
    // Admin bypass
    if (user.role === "admin") {
      return true;
    }

    // Check explicit permissions
    if (user.permissions.includes(permission)) {
      return true;
    }

    // Check role-based permissions
    const role = this.roles.get(user.role);
    if (role && role.permissions.includes(permission)) {
      return true;
    }

    // Check policies
    const allowed = await this.checkPolicies(user.role, permission, context);

    return allowed;
  }

  /**
   * Check if user has any of the given permissions
   */
  async hasAnyPermission(
    user: User,
    permissions: Permission[]
  ): Promise<boolean> {
    for (const permission of permissions) {
      if (await this.hasPermission(user, permission)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Check if user has all of the given permissions
   */
  async hasAllPermissions(
    user: User,
    permissions: Permission[]
  ): Promise<boolean> {
    for (const permission of permissions) {
      if (!(await this.hasPermission(user, permission))) {
        return false;
      }
    }

    return true;
  }

  /**
   * Authorize action with detailed result
   */
  async authorize(
    user: User,
    permission: Permission,
    context?: Record<string, any>
  ): Promise<AuthorizationCheckResult> {
    const allowed = await this.hasPermission(user, permission, context);

    if (allowed) {
      return { allowed: true };
    }

    const role = this.roles.get(user.role);
    return {
      allowed: false,
      reason: `User with role '${user.role}' does not have permission '${permission}'`,
      requiredPermissions: [permission],
      requiredRole: role?.role,
    };
  }

  /**
   * Create RBAC policy
   */
  async createPolicy(
    policy: Omit<RBACPolicy, "id" | "createdAt">
  ): Promise<RBACPolicy> {
    const id = `policy_${Date.now()}_${crypto.randomBytes(8).toString("hex")}`;
    const now = new Date();

    const rbacPolicy: RBACPolicy = {
      ...policy,
      id,
      createdAt: now,
    };

    await this.db.execute(
      `INSERT INTO rbac_policies (id, role, resource, action, allowed, conditions, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        policy.role,
        policy.resource,
        policy.action,
        policy.allowed ? 1 : 0,
        policy.conditions ? JSON.stringify(policy.conditions) : null,
        now,
      ]
    );

    this.policies.set(id, rbacPolicy);

    return rbacPolicy;
  }

  /**
   * Get role definition
   */
  getRole(role: UserRole): RoleDefinition | undefined {
    return this.roles.get(role);
  }

  /**
   * List all roles
   */
  listRoles(): RoleDefinition[] {
    return Array.from(this.roles.values());
  }

  /**
   * Add permission to role (custom roles only)
   */
  async addPermissionToRole(
    role: UserRole,
    permission: Permission
  ): Promise<void> {
    const roleDef = this.roles.get(role);
    if (!roleDef || !roleDef.canBeModified) {
      throw new Error(`Cannot modify role: ${role}`);
    }

    if (!roleDef.permissions.includes(permission)) {
      roleDef.permissions.push(permission);
    }

    await this.db.execute(`UPDATE roles SET permissions = ? WHERE role = ?`, [
      roleDef.permissions.join(","),
      role,
    ]);
  }

  /**
   * Remove permission from role
   */
  async removePermissionFromRole(
    role: UserRole,
    permission: Permission
  ): Promise<void> {
    const roleDef = this.roles.get(role);
    if (!roleDef || !roleDef.canBeModified) {
      throw new Error(`Cannot modify role: ${role}`);
    }

    const index = roleDef.permissions.indexOf(permission);
    if (index > -1) {
      roleDef.permissions.splice(index, 1);
    }

    await this.db.execute(`UPDATE roles SET permissions = ? WHERE role = ?`, [
      roleDef.permissions.join(","),
      role,
    ]);
  }

  /**
   * Audit log entry
   */
  async auditLog(
    entry: Omit<AuditLogEntry, "id" | "timestamp">
  ): Promise<AuditLogEntry> {
    const id = `audit_${Date.now()}_${crypto.randomBytes(8).toString("hex")}`;
    const now = new Date();

    const auditEntry: AuditLogEntry = {
      ...entry,
      id,
      timestamp: now,
    };

    await this.db.execute(
      `INSERT INTO audit_logs (id, user_id, action, resource, resource_id, changes, ip_address, user_agent, status, error, timestamp)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        entry.userId,
        entry.action,
        entry.resource,
        entry.resourceId,
        entry.changes ? JSON.stringify(entry.changes) : null,
        entry.ipAddress,
        entry.userAgent,
        entry.status,
        entry.error,
        now,
      ]
    );

    return auditEntry;
  }

  /**
   * Get audit logs for user
   */
  async getAuditLogsForUser(
    userId: string,
    limit: number = 100,
    offset: number = 0
  ): Promise<AuditLogEntry[]> {
    const results = await this.db.query(
      `SELECT * FROM audit_logs WHERE user_id = ? ORDER BY timestamp DESC LIMIT ? OFFSET ?`,
      [userId, limit, offset]
    );

    return results.map((row) => this.rowToAuditLog(row));
  }

  /**
   * Get audit logs for resource
   */
  async getAuditLogsForResource(
    resource: string,
    resourceId?: string
  ): Promise<AuditLogEntry[]> {
    let query = `SELECT * FROM audit_logs WHERE resource = ?`;
    const params: any[] = [resource];

    if (resourceId) {
      query += ` AND resource_id = ?`;
      params.push(resourceId);
    }

    query += ` ORDER BY timestamp DESC`;

    const results = await this.db.query(query, params);

    return results.map((row) => this.rowToAuditLog(row));
  }

  /**
   * Check resource ownership
   */
  async isResourceOwner(
    userId: string,
    resourceType: string,
    resourceId: string
  ): Promise<boolean> {
    const results = await this.db.query(
      `SELECT owner_id FROM ${resourceType} WHERE id = ?`,
      [resourceId]
    );

    if (results.length === 0) {
      return false;
    }

    return results[0].owner_id === userId;
  }

  /**
   * Check resource access
   */
  async canAccessResource(
    user: User,
    resourceType: string,
    resourceId: string,
    action: string = "read"
  ): Promise<boolean> {
    // Admin always has access
    if (user.role === "admin") {
      return true;
    }

    // Check if user is owner
    if (
      (action === "update" || action === "delete") &&
      (await this.isResourceOwner(user.id, resourceType, resourceId))
    ) {
      return true;
    }

    // Check permissions
    const permission = `${resourceType}.${action}` as Permission;
    return this.hasPermission(user, permission);
  }

  /**
   * Check policies
   */
  private async checkPolicies(
    role: UserRole,
    action: string,
    context?: Record<string, any>
  ): Promise<boolean> {
    const results = await this.db.query(
      `SELECT * FROM rbac_policies WHERE role = ? AND action = ? AND allowed = 1`,
      [role, action]
    );

    for (const row of results) {
      const policy = this.rowToPolicy(row);

      if (this.matchesConditions(policy.conditions, context)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Match conditions
   */
  private matchesConditions(
    conditions?: Record<string, any>,
    context?: Record<string, any>
  ): boolean {
    if (!conditions) {
      return true;
    }

    if (!context) {
      return false;
    }

    for (const [key, value] of Object.entries(conditions)) {
      if (context[key] !== value) {
        return false;
      }
    }

    return true;
  }

  /**
   * Convert DB row to AuditLogEntry
   */
  private rowToAuditLog(row: any): AuditLogEntry {
    return {
      id: row.id,
      userId: row.user_id,
      action: row.action,
      resource: row.resource,
      resourceId: row.resource_id,
      changes: row.changes ? JSON.parse(row.changes) : undefined,
      ipAddress: row.ip_address,
      userAgent: row.user_agent,
      status: row.status,
      error: row.error,
      timestamp: new Date(row.timestamp),
    };
  }

  /**
   * Convert DB row to Policy
   */
  private rowToPolicy(row: any): RBACPolicy {
    return {
      id: row.id,
      role: row.role,
      resource: row.resource,
      action: row.action,
      allowed: row.allowed === 1,
      conditions: row.conditions ? JSON.parse(row.conditions) : undefined,
      createdAt: new Date(row.created_at),
    };
  }
}

/**
 * Create authorization service
 */
export function createAuthorizationService(
  db: DatabaseManager
): AuthorizationService {
  return new AuthorizationService(db);
}
