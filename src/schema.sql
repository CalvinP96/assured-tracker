-- ============================================================================
-- Assured Energy Solutions — Supabase Database Schema
-- Run this in your Supabase SQL Editor (Dashboard → SQL Editor → New Query)
-- ============================================================================

-- 1. Create the projects table
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program TEXT NOT NULL CHECK (program IN ('WHE SF', 'HES IE')),
  customer_name TEXT NOT NULL DEFAULT '',
  address TEXT NOT NULL DEFAULT '',
  stage TEXT NOT NULL DEFAULT 'Lead',
  type TEXT NOT NULL DEFAULT 'Comprehensive' CHECK (type IN ('Comprehensive', 'Deferred')),
  lead_date DATE,
  assessment_date DATE,
  rise_submit_date DATE,
  ri_approved_date DATE,
  install_date DATE,
  last_install_date DATE,
  next_install_date DATE,
  total_job_price NUMERIC(12,2),
  invoiceable BOOLEAN NOT NULL DEFAULT FALSE,
  invoice_submitted_date DATE,
  permit_status TEXT NOT NULL DEFAULT 'N/A',
  permit_number TEXT DEFAULT '',
  permit_applied_date DATE,
  permit_issued_date DATE,
  permit_jurisdiction TEXT DEFAULT '',
  permit_inspection_date DATE,
  permit_closed_date DATE,
  permit_notes TEXT DEFAULT '',
  docs JSONB NOT NULL DEFAULT '{}',
  stage_history JSONB NOT NULL DEFAULT '[]',
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Auto-update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- 3. Enable Row Level Security (RLS)
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- 4. Policy: allow all authenticated users full access (internal team)
--    This means anyone logged in can read/write all projects.
CREATE POLICY "Authenticated users can read all projects"
  ON projects FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert projects"
  ON projects FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update projects"
  ON projects FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete projects"
  ON projects FOR DELETE
  TO authenticated
  USING (true);

-- 5. Enable realtime for the projects table
ALTER PUBLICATION supabase_realtime ADD TABLE projects;

-- 6. Create indexes for common queries
CREATE INDEX idx_projects_program ON projects (program);
CREATE INDEX idx_projects_stage ON projects (stage);
CREATE INDEX idx_projects_next_install ON projects (next_install_date);
CREATE INDEX idx_projects_created ON projects (created_at);
