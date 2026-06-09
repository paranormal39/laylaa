// ID generation utilities
// SPDX-License-Identifier: Apache-2.0

import { randomBytes, createHash } from 'crypto';

/**
 * Generate a unique ID
 */
export function generateId(prefix?: string): string {
  const timestamp = Date.now().toString(36);
  const random = randomBytes(8).toString('hex');
  const id = `${timestamp}-${random}`;
  return prefix ? `${prefix}-${id}` : id;
}

/**
 * Generate a URL-friendly slug from a string
 */
export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-')         // Replace spaces with hyphens
    .replace(/-+/g, '-');         // Remove consecutive hyphens
}

/**
 * Generate a deterministic ID from a string
 */
export function generateDeterministicId(input: string): string {
  return createHash('sha256')
    .update(input)
    .digest('hex')
    .slice(0, 16);
}
