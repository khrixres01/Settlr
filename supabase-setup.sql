-- ============================================================
-- ProfitShare — Supabase Setup SQL
-- Run this in the Supabase SQL Editor for your project
-- ============================================================

-- 1. CATEGORIES TABLE
CREATE TABLE IF NOT EXISTS categories (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL,                     -- 'revenue_split' | 'fixed_profit_per_unit'
  bobo_pct REAL NOT NULL,
  mama_pct REAL NOT NULL,
  utilities_pct REAL NOT NULL,
  fixed_profit_per_unit REAL NOT NULL DEFAULT 0
);

-- 2. SALES TABLE (splits stored at write time, never recomputed)
CREATE TABLE IF NOT EXISTS sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id INTEGER NOT NULL REFERENCES categories(id),
  category_name TEXT NOT NULL,
  item_name TEXT NOT NULL,
  quantity REAL NOT NULL,
  selling_price REAL NOT NULL,
  base_amount REAL NOT NULL,
  bobo_share REAL NOT NULL,
  mama_share REAL NOT NULL,
  utilities_share REAL NOT NULL,
  sale_date DATE NOT NULL DEFAULT CURRENT_DATE,
  week_number INTEGER NOT NULL,
  month INTEGER NOT NULL,
  year INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. SETTINGS TABLE (PIN, account details)
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- ============================================================
-- SEED: CATEGORIES (business rules — hardcoded)
-- ============================================================
INSERT INTO categories (name, type, bobo_pct, mama_pct, utilities_pct, fixed_profit_per_unit)
VALUES
  ('Ice Block',  'revenue_split',        60, 30, 10, 0),
  ('Drinks',     'fixed_profit_per_unit', 50, 30, 20, 100)
ON CONFLICT DO NOTHING;

-- ============================================================
-- SEED: SETTINGS (default PIN and empty account fields)
-- ============================================================
INSERT INTO settings (key, value) VALUES
  ('report_pin',       '0000'),
  ('bank_name',        ''),
  ('account_name',     ''),
  ('account_number',   '')
ON CONFLICT (key) DO NOTHING;

-- 4. PROFILES TABLE (roles + personal PIN)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'user',  -- 'admin' | 'user'
  report_pin TEXT NOT NULL DEFAULT '0000'
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales      ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings   ENABLE ROW LEVEL SECURITY;

-- Profiles RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_select" ON profiles
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles_insert_own" ON profiles
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- Categories: authenticated users can SELECT
CREATE POLICY "categories_select" ON categories
  FOR SELECT TO authenticated USING (true);

-- Categories: only admin can UPDATE
CREATE POLICY "categories_update_admin" ON categories
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Sales: authenticated users can SELECT, INSERT, DELETE
CREATE POLICY "sales_select" ON sales
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "sales_insert" ON sales
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "sales_delete" ON sales
  FOR DELETE TO authenticated USING (true);

-- Settings: authenticated users can SELECT and UPSERT
CREATE POLICY "settings_select" ON settings
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "settings_upsert" ON settings
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- REALTIME: enable on sales table
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE sales;
