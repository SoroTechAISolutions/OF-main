// ============================================
// User Service (Team Management)
// ============================================

import bcrypt from 'bcryptjs';
import { query } from '../db/connection';
import { User, PaginationParams, PaginatedResponse } from '../types';

const SALT_ROUNDS = 10;

/**
 * Get all users for agency
 */
export async function getUsersByAgency(
  agencyId: string,
  pagination?: PaginationParams
): Promise<PaginatedResponse<Omit<User, 'password_hash'>>> {
  const page = pagination?.page || 1;
  const limit = pagination?.limit || 20;
  const offset = (page - 1) * limit;
  const sortBy = pagination?.sortBy || 'created_at';
  const sortOrder = pagination?.sortOrder || 'desc';

  // Validate sortBy to prevent SQL injection
  const allowedSortFields = ['created_at', 'name', 'email', 'role'];
  const safeSortBy = allowedSortFields.includes(sortBy) ? sortBy : 'created_at';

  const countResult = await query(
    'SELECT COUNT(*) FROM users WHERE agency_id = $1',
    [agencyId]
  );
  const total = parseInt(countResult.rows[0].count);

  const result = await query(
    `SELECT id, agency_id, email, name, role, is_active, last_login_at, created_at, updated_at
     FROM users
     WHERE agency_id = $1
     ORDER BY ${safeSortBy} ${sortOrder}
     LIMIT $2 OFFSET $3`,
    [agencyId, limit, offset]
  );

  return {
    items: result.rows,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit)
  };
}

/**
 * Get user by ID
 */
export async function getUserById(
  userId: string,
  agencyId: string
): Promise<Omit<User, 'password_hash'> | null> {
  const result = await query(
    `SELECT id, agency_id, email, name, role, is_active, last_login_at, created_at, updated_at
     FROM users
     WHERE id = $1 AND agency_id = $2`,
    [userId, agencyId]
  );
  return result.rows[0] || null;
}

/**
 * Create new user (team member)
 */
export async function createUser(
  agencyId: string,
  data: {
    email: string;
    password: string;
    name: string;
    role?: 'admin' | 'chatter';
  }
): Promise<Omit<User, 'password_hash'>> {
  const passwordHash = await bcrypt.hash(data.password, SALT_ROUNDS);

  const result = await query(
    `INSERT INTO users (agency_id, email, password_hash, name, role)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, agency_id, email, name, role, is_active, created_at, updated_at`,
    [
      agencyId,
      data.email,
      passwordHash,
      data.name,
      data.role || 'chatter'
    ]
  );

  return result.rows[0];
}

/**
 * Update user
 */
export async function updateUser(
  userId: string,
  agencyId: string,
  data: Partial<{
    name: string;
    role: 'admin' | 'chatter';
    is_active: boolean;
  }>
): Promise<Omit<User, 'password_hash'> | null> {
  const updates: string[] = [];
  const values: any[] = [];
  let paramCount = 1;

  const allowedFields = ['name', 'role', 'is_active'];

  for (const field of allowedFields) {
    if (data[field as keyof typeof data] !== undefined) {
      updates.push(`${field} = $${paramCount}`);
      values.push(data[field as keyof typeof data]);
      paramCount++;
    }
  }

  if (updates.length === 0) {
    return getUserById(userId, agencyId);
  }

  updates.push('updated_at = NOW()');
  values.push(userId, agencyId);

  const result = await query(
    `UPDATE users SET ${updates.join(', ')}
     WHERE id = $${paramCount} AND agency_id = $${paramCount + 1}
     RETURNING id, agency_id, email, name, role, is_active, last_login_at, created_at, updated_at`,
    values
  );

  return result.rows[0] || null;
}

/**
 * Change user password
 */
export async function changeUserPassword(
  userId: string,
  agencyId: string,
  newPassword: string
): Promise<boolean> {
  const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);

  const result = await query(
    `UPDATE users SET password_hash = $1, updated_at = NOW()
     WHERE id = $2 AND agency_id = $3`,
    [passwordHash, userId, agencyId]
  );

  return (result.rowCount ?? 0) > 0;
}

/**
 * Delete user (soft delete by deactivating)
 */
export async function deleteUser(
  userId: string,
  agencyId: string
): Promise<boolean> {
  // Don't allow deleting owners
  const user = await getUserById(userId, agencyId);
  if (!user || user.role === 'owner') {
    return false;
  }

  const result = await query(
    'DELETE FROM users WHERE id = $1 AND agency_id = $2 AND role != $3',
    [userId, agencyId, 'owner']
  );

  return (result.rowCount ?? 0) > 0;
}

/**
 * Check if email exists in agency
 */
export async function emailExistsInAgency(
  email: string,
  agencyId: string
): Promise<boolean> {
  const result = await query(
    'SELECT id FROM users WHERE email = $1 AND agency_id = $2',
    [email, agencyId]
  );
  return result.rows.length > 0;
}

/**
 * Check if email exists globally
 */
export async function emailExists(email: string): Promise<boolean> {
  const result = await query(
    'SELECT id FROM users WHERE email = $1',
    [email]
  );
  return result.rows.length > 0;
}
