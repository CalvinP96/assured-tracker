-- ============================================================================
-- Tables backing src/db.js (projects + PIN users as JSONB blobs)
-- Run this in your Supabase SQL Editor (Dashboard → SQL Editor → New Query)
-- ============================================================================

CREATE TABLE IF NOT EXISTS tracker_projects (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tracker_users (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION tracker_touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tracker_projects_updated_at ON tracker_projects;
CREATE TRIGGER tracker_projects_updated_at
  BEFORE UPDATE ON tracker_projects
  FOR EACH ROW EXECUTE FUNCTION tracker_touch_updated_at();

DROP TRIGGER IF EXISTS tracker_users_updated_at ON tracker_users;
CREATE TRIGGER tracker_users_updated_at
  BEFORE UPDATE ON tracker_users
  FOR EACH ROW EXECUTE FUNCTION tracker_touch_updated_at();

-- Same access model as the projects table: any authenticated team member
-- has full read/write access.
ALTER TABLE tracker_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE tracker_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated full access" ON tracker_projects
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated full access" ON tracker_users
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
