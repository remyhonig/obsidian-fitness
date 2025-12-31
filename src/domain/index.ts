/**
 * Domain layer - Pure business logic
 *
 * This module contains all domain/business logic extracted from the application.
 * All functions are pure (no side effects, no framework dependencies).
 * Only imports allowed: types from ../types.ts
 */

// Metrics - Calculations for sessions, exercises, and sets
export * from './metrics';

// Session - Lifecycle rules and completion logic
export * from './session';

// Identifier - Slug and ID generation
export * from './identifier';

// Reference - Wiki-link parsing and exercise source determination
export * from './reference';

// Feedback - Name normalization and validation
export * from './feedback';
