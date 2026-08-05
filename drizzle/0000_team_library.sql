CREATE TABLE IF NOT EXISTS saved_teams (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  team_json TEXT NOT NULL,
  replica_code TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
) WITHOUT ROWID;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_saved_teams_updated_at
ON saved_teams(updated_at DESC);
--> statement-breakpoint
PRAGMA optimize;
