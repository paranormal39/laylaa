// Validation utilities
// SPDX-License-Identifier: Apache-2.0

import type { NFTMetadata, Listing } from '../types/nft.js';
import { MARKETPLACE_CONSTANTS } from '../constants/networks.js';

/**
 * Validate NFT metadata
 */
export function validateMetadata(metadata: NFTMetadata): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!metadata.name || metadata.name.trim().length === 0) {
    errors.push('Name is required');
  }

  if (metadata.name && metadata.name.length > 100) {
    errors.push('Name must be 100 characters or less');
  }

  if (!metadata.description || metadata.description.trim().length === 0) {
    errors.push('Description is required');
  }

  if (metadata.description && metadata.description.length > 1000) {
    errors.push('Description must be 1000 characters or less');
  }

  if (!metadata.image || metadata.image.trim().length === 0) {
    errors.push('Image is required');
  }

  if (metadata.attributes) {
    for (const attr of metadata.attributes) {
      if (!attr.trait_type || attr.trait_type.trim().length === 0) {
        errors.push('Attribute trait_type is required');
      }
      if (attr.value === undefined || attr.value === null) {
        errors.push('Attribute value is required');
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validate listing
 */
export function validateListing(listing: Partial<Listing>): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!listing.nftId) {
    errors.push('NFT ID is required');
  }

  if (!listing.seller) {
    errors.push('Seller address is required');
  }

  if (!listing.price) {
    errors.push('Price is required');
  } else {
    const minPrice = BigInt(MARKETPLACE_CONSTANTS.MIN_LISTING_PRICE);
    const price = BigInt(listing.price);
    if (price < minPrice) {
      errors.push(`Price must be at least ${MARKETPLACE_CONSTANTS.MIN_LISTING_PRICE}`);
    }
  }

  if (!listing.currency) {
    errors.push('Currency is required');
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validate XRPL address
 */
export function isValidXRPLAddress(address: string): boolean {
  // XRPL addresses start with 'r' and are 25-35 characters long
  // Using Base58Check encoding
  if (!address || address.length < 25 || address.length > 35) {
    return false;
  }
  if (!address.startsWith('r')) {
    return false;
  }
  // Basic regex for XRPL address format
  const xrplAddressRegex = /^r[1-9A-HJ-NP-Za-km-z]{24,34}$/;
  return xrplAddressRegex.test(address);
}

/**
 * Validate Midnight address
 */
export function isValidMidnightAddress(address: string): boolean {
  // Midnight addresses use bech32m encoding
  // They start with network prefix like "mn_addr_"
  if (!address || address.length < 20) {
    return false;
  }
  // Basic check for Midnight address format
  return address.startsWith('mn_') || address.startsWith('addr_');
}
