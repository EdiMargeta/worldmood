-- ============================================================
-- WorldMood — Supabase Migration
-- Run this in: Supabase Dashboard > SQL Editor
-- ============================================================

-- ── 1. COUNTRIES ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS countries (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  iso_code    CHAR(2) UNIQUE NOT NULL,
  continent   TEXT NOT NULL,
  region      TEXT NOT NULL,
  flag_emoji  TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_countries_iso ON countries(iso_code);

-- ── 2. VOTES ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS votes (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country_id        UUID REFERENCES countries(id) ON DELETE CASCADE,
  vote_type         TEXT CHECK (vote_type IN ('positive', 'negative')) NOT NULL,
  voter_fingerprint TEXT NOT NULL,
  voter_ip_hash     TEXT,
  vote_source       TEXT DEFAULT 'web',
  is_simulated      BOOLEAN DEFAULT FALSE,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_votes_country_created ON votes(country_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_votes_fingerprint ON votes(voter_fingerprint, country_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_votes_created ON votes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_votes_simulated ON votes(is_simulated, created_at DESC);

-- ── 3. SIMULATION SETTINGS ───────────────────────────────────
CREATE TABLE IF NOT EXISTS simulation_settings (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enabled            BOOLEAN DEFAULT FALSE,
  cooldown_hours     INTEGER DEFAULT 24,
  votes_per_interval INTEGER DEFAULT 10,
  like_probability   DECIMAL(3,2) DEFAULT 0.65,
  interval_seconds   INTEGER DEFAULT 30,
  updated_at         TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default settings row
INSERT INTO simulation_settings (enabled, cooldown_hours, votes_per_interval, like_probability, interval_seconds)
VALUES (FALSE, 24, 10, 0.65, 30)
ON CONFLICT DO NOTHING;

-- ── 4. DAILY QUESTIONS ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS daily_questions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question    TEXT NOT NULL,
  date        DATE UNIQUE NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS daily_question_votes (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id       UUID REFERENCES daily_questions(id) ON DELETE CASCADE,
  country_id        UUID REFERENCES countries(id) ON DELETE CASCADE,
  voter_fingerprint TEXT NOT NULL,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(question_id, voter_fingerprint)
);

-- ── 5. ROW LEVEL SECURITY ────────────────────────────────────
-- Allow public read on countries
ALTER TABLE countries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read countries" ON countries FOR SELECT USING (true);

-- Allow public read/insert on votes (server validates via service role)
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read votes" ON votes FOR SELECT USING (true);
CREATE POLICY "Service role insert votes" ON votes FOR INSERT WITH CHECK (true);

-- Public read simulation settings
ALTER TABLE simulation_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read sim settings" ON simulation_settings FOR SELECT USING (true);
CREATE POLICY "Service update sim settings" ON simulation_settings FOR UPDATE USING (true);

-- Public on daily questions
ALTER TABLE daily_questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read daily questions" ON daily_questions FOR SELECT USING (true);
CREATE POLICY "Service insert daily questions" ON daily_questions FOR INSERT WITH CHECK (true);

ALTER TABLE daily_question_votes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read dq votes" ON daily_question_votes FOR SELECT USING (true);
CREATE POLICY "Service insert dq votes" ON daily_question_votes FOR INSERT WITH CHECK (true);

-- ── 6. REALTIME ──────────────────────────────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE votes;

-- ── 7. SEED COUNTRIES ────────────────────────────────────────
INSERT INTO countries (name, iso_code, continent, region, flag_emoji) VALUES
  -- Africa
  ('Algeria', 'DZ', 'Africa', 'Northern Africa', '🇩🇿'),
  ('Egypt', 'EG', 'Africa', 'Northern Africa', '🇪🇬'),
  ('Ethiopia', 'ET', 'Africa', 'Eastern Africa', '🇪🇹'),
  ('Ghana', 'GH', 'Africa', 'Western Africa', '🇬🇭'),
  ('Kenya', 'KE', 'Africa', 'Eastern Africa', '🇰🇪'),
  ('Morocco', 'MA', 'Africa', 'Northern Africa', '🇲🇦'),
  ('Nigeria', 'NG', 'Africa', 'Western Africa', '🇳🇬'),
  ('South Africa', 'ZA', 'Africa', 'Southern Africa', '🇿🇦'),
  ('Tanzania', 'TZ', 'Africa', 'Eastern Africa', '🇹🇿'),
  ('Tunisia', 'TN', 'Africa', 'Northern Africa', '🇹🇳'),
  -- Asia
  ('Afghanistan', 'AF', 'Asia', 'Southern Asia', '🇦🇫'),
  ('Bangladesh', 'BD', 'Asia', 'Southern Asia', '🇧🇩'),
  ('China', 'CN', 'Asia', 'Eastern Asia', '🇨🇳'),
  ('India', 'IN', 'Asia', 'Southern Asia', '🇮🇳'),
  ('Indonesia', 'ID', 'Asia', 'South-eastern Asia', '🇮🇩'),
  ('Iran', 'IR', 'Asia', 'Southern Asia', '🇮🇷'),
  ('Iraq', 'IQ', 'Asia', 'Western Asia', '🇮🇶'),
  ('Israel', 'IL', 'Asia', 'Western Asia', '🇮🇱'),
  ('Japan', 'JP', 'Asia', 'Eastern Asia', '🇯🇵'),
  ('Jordan', 'JO', 'Asia', 'Western Asia', '🇯🇴'),
  ('Kazakhstan', 'KZ', 'Asia', 'Central Asia', '🇰🇿'),
  ('Malaysia', 'MY', 'Asia', 'South-eastern Asia', '🇲🇾'),
  ('Myanmar', 'MM', 'Asia', 'South-eastern Asia', '🇲🇲'),
  ('Nepal', 'NP', 'Asia', 'Southern Asia', '🇳🇵'),
  ('North Korea', 'KP', 'Asia', 'Eastern Asia', '🇰🇵'),
  ('Pakistan', 'PK', 'Asia', 'Southern Asia', '🇵🇰'),
  ('Philippines', 'PH', 'Asia', 'South-eastern Asia', '🇵🇭'),
  ('Saudi Arabia', 'SA', 'Asia', 'Western Asia', '🇸🇦'),
  ('Singapore', 'SG', 'Asia', 'South-eastern Asia', '🇸🇬'),
  ('South Korea', 'KR', 'Asia', 'Eastern Asia', '🇰🇷'),
  ('Sri Lanka', 'LK', 'Asia', 'Southern Asia', '🇱🇰'),
  ('Syria', 'SY', 'Asia', 'Western Asia', '🇸🇾'),
  ('Taiwan', 'TW', 'Asia', 'Eastern Asia', '🇹🇼'),
  ('Thailand', 'TH', 'Asia', 'South-eastern Asia', '🇹🇭'),
  ('Turkey', 'TR', 'Asia', 'Western Asia', '🇹🇷'),
  ('UAE', 'AE', 'Asia', 'Western Asia', '🇦🇪'),
  ('Vietnam', 'VN', 'Asia', 'South-eastern Asia', '🇻🇳'),
  ('Yemen', 'YE', 'Asia', 'Western Asia', '🇾🇪'),
  -- Europe
  ('Austria', 'AT', 'Europe', 'Western Europe', '🇦🇹'),
  ('Belarus', 'BY', 'Europe', 'Eastern Europe', '🇧🇾'),
  ('Belgium', 'BE', 'Europe', 'Western Europe', '🇧🇪'),
  ('Czech Republic', 'CZ', 'Europe', 'Eastern Europe', '🇨🇿'),
  ('Denmark', 'DK', 'Europe', 'Northern Europe', '🇩🇰'),
  ('Finland', 'FI', 'Europe', 'Northern Europe', '🇫🇮'),
  ('France', 'FR', 'Europe', 'Western Europe', '🇫🇷'),
  ('Germany', 'DE', 'Europe', 'Western Europe', '🇩🇪'),
  ('Greece', 'GR', 'Europe', 'Southern Europe', '🇬🇷'),
  ('Hungary', 'HU', 'Europe', 'Eastern Europe', '🇭🇺'),
  ('Iceland', 'IS', 'Europe', 'Northern Europe', '🇮🇸'),
  ('Ireland', 'IE', 'Europe', 'Northern Europe', '🇮🇪'),
  ('Italy', 'IT', 'Europe', 'Southern Europe', '🇮🇹'),
  ('Netherlands', 'NL', 'Europe', 'Western Europe', '🇳🇱'),
  ('Norway', 'NO', 'Europe', 'Northern Europe', '🇳🇴'),
  ('Poland', 'PL', 'Europe', 'Eastern Europe', '🇵🇱'),
  ('Portugal', 'PT', 'Europe', 'Southern Europe', '🇵🇹'),
  ('Romania', 'RO', 'Europe', 'Eastern Europe', '🇷🇴'),
  ('Russia', 'RU', 'Europe', 'Eastern Europe', '🇷🇺'),
  ('Serbia', 'RS', 'Europe', 'Southern Europe', '🇷🇸'),
  ('Spain', 'ES', 'Europe', 'Southern Europe', '🇪🇸'),
  ('Sweden', 'SE', 'Europe', 'Northern Europe', '🇸🇪'),
  ('Switzerland', 'CH', 'Europe', 'Western Europe', '🇨🇭'),
  ('Ukraine', 'UA', 'Europe', 'Eastern Europe', '🇺🇦'),
  ('United Kingdom', 'GB', 'Europe', 'Northern Europe', '🇬🇧'),
  -- North America
  ('Canada', 'CA', 'North America', 'Northern America', '🇨🇦'),
  ('Cuba', 'CU', 'North America', 'Caribbean', '🇨🇺'),
  ('Guatemala', 'GT', 'North America', 'Central America', '🇬🇹'),
  ('Haiti', 'HT', 'North America', 'Caribbean', '🇭🇹'),
  ('Honduras', 'HN', 'North America', 'Central America', '🇭🇳'),
  ('Mexico', 'MX', 'North America', 'Central America', '🇲🇽'),
  ('Panama', 'PA', 'North America', 'Central America', '🇵🇦'),
  ('United States', 'US', 'North America', 'Northern America', '🇺🇸'),
  -- South America
  ('Argentina', 'AR', 'South America', 'South America', '🇦🇷'),
  ('Bolivia', 'BO', 'South America', 'South America', '🇧🇴'),
  ('Brazil', 'BR', 'South America', 'South America', '🇧🇷'),
  ('Chile', 'CL', 'South America', 'South America', '🇨🇱'),
  ('Colombia', 'CO', 'South America', 'South America', '🇨🇴'),
  ('Ecuador', 'EC', 'South America', 'South America', '🇪🇨'),
  ('Peru', 'PE', 'South America', 'South America', '🇵🇪'),
  ('Uruguay', 'UY', 'South America', 'South America', '🇺🇾'),
  ('Venezuela', 'VE', 'South America', 'South America', '🇻🇪'),
  -- Oceania
  ('Australia', 'AU', 'Oceania', 'Australia and New Zealand', '🇦🇺'),
  ('Fiji', 'FJ', 'Oceania', 'Melanesia', '🇫🇯'),
  ('New Zealand', 'NZ', 'Oceania', 'Australia and New Zealand', '🇳🇿'),
  ('Papua New Guinea', 'PG', 'Oceania', 'Melanesia', '🇵🇬')
ON CONFLICT (iso_code) DO NOTHING;
