-- promptbin database (Cloudflare D1 / SQLite)

CREATE TABLE IF NOT EXISTS prompts (
  id         TEXT PRIMARY KEY,
  title      TEXT NOT NULL,
  text       TEXT NOT NULL,
  cats       TEXT NOT NULL,
  image      TEXT,                       -- image key (12 hex chars) or NULL for the built-in illustration
  published  INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_prompts_created ON prompts (created_at DESC);

-- Optimised photos uploaded from the admin console (already resized to WebP in the browser), base64 encoded.
CREATE TABLE IF NOT EXISTS images (
  name       TEXT PRIMARY KEY,           -- e.g. a1b2c3d4e5f6-400, -800 (prompts) or -s, -p (stories)
  mime       TEXT NOT NULL,
  data       TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS stories (
  id           TEXT PRIMARY KEY,         -- URL slug
  title        TEXT NOT NULL,
  description  TEXT NOT NULL,
  cover        TEXT NOT NULL,            -- image key (-p poster) or a /public path
  slides       TEXT NOT NULL,            -- JSON array: [{image, heading, text}]
  outlink_url  TEXT,
  outlink_text TEXT,
  published    INTEGER NOT NULL DEFAULT 1,
  created_at   TEXT NOT NULL,
  updated_at   TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_stories_created ON stories (created_at DESC);

CREATE TABLE IF NOT EXISTS login_attempts (
  ip TEXT PRIMARY KEY,
  n  INTEGER NOT NULL,
  t  INTEGER NOT NULL
);
