-- GitHub connections
CREATE TABLE IF NOT EXISTS github_connections (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL UNIQUE,
  github_username TEXT NOT NULL,
  github_access_token TEXT NOT NULL,
  avatar_url TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Project-level GitHub repo links
CREATE TABLE IF NOT EXISTS project_repos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL,
  repo_full_name TEXT NOT NULL,
  repo_url TEXT NOT NULL,
  default_branch TEXT DEFAULT 'main',
  last_pushed_at TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  UNIQUE(project_id)
);

-- Cloudflare connections
CREATE TABLE IF NOT EXISTS cloudflare_connections (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL UNIQUE,
  account_id TEXT NOT NULL,
  api_token TEXT NOT NULL,
  email TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Project-level Cloudflare deployments
CREATE TABLE IF NOT EXISTS project_deployments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL,
  deployment_type TEXT NOT NULL,
  deployment_url TEXT,
  status TEXT DEFAULT 'pending',
  deployed_at TEXT DEFAULT (datetime('now')),
  error_message TEXT
);
