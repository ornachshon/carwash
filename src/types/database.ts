/**
 * Convenience aliases over generated Supabase types.
 * Source of truth: database.generated.ts (regenerate via Supabase MCP / `supabase gen types`).
 */
export type { Database, Enums, Tables, TablesInsert, TablesUpdate } from './database.generated';

import type { Enums, Tables } from './database.generated';

export type UserRole = Enums<'user_role'>;
export type WashJobStatus = Enums<'wash_job_status'>;
export type VehicleSizeCategory = Enums<'vehicle_size_category'>;

export type User = Tables<'users'>;
export type WasherProfile = Tables<'washer_profiles'>;
export type Vehicle = Tables<'vehicles'>;
export type WashJob = Tables<'wash_jobs'>;
export type JobStatusHistory = Tables<'job_status_history'>;
export type Rating = Tables<'ratings'>;
