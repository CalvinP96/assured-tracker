-- ============================================================================
-- Migration: Add Hold Status & Next Expected Action fields
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New Query)
-- ============================================================================

-- Hold status fields
ALTER TABLE projects ADD COLUMN IF NOT EXISTS on_hold BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS hold_reason TEXT DEFAULT '';
ALTER TABLE projects ADD COLUMN IF NOT EXISTS hold_date DATE;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS hold_party TEXT DEFAULT '' CHECK (hold_party IN ('', 'Us', 'Customer', 'Utility', 'Contractor', 'Permit Office', 'Other'));

-- Next expected action fields
ALTER TABLE projects ADD COLUMN IF NOT EXISTS next_action TEXT DEFAULT '';
ALTER TABLE projects ADD COLUMN IF NOT EXISTS next_action_date DATE;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS next_action_owner TEXT DEFAULT '' CHECK (next_action_owner IN ('', 'Us', 'Customer', 'Utility', 'Contractor', 'Permit Office', 'Other'));

-- Add ASI as allowed program
ALTER TABLE projects DROP CONSTRAINT IF EXISTS projects_program_check;
ALTER TABLE projects ADD CONSTRAINT projects_program_check CHECK (program IN ('WHE SF', 'HES IE', 'ASI'));
