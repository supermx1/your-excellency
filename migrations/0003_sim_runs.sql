-- The Timeline: saved runs. A run is its inputs; featured runs also keep their recording
-- (gzipped JSON, base64) so they replay the same after engine changes.
CREATE TABLE IF NOT EXISTS sim_runs (
	id TEXT PRIMARY KEY,
	inputs_hash TEXT NOT NULL UNIQUE,
	engine_version INTEGER NOT NULL,
	inputs TEXT NOT NULL,
	title TEXT,
	featured INTEGER NOT NULL DEFAULT 0,
	narration TEXT,
	summary TEXT,
	output TEXT,
	featured_at TEXT,
	created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS sim_runs_featured ON sim_runs (featured, featured_at);
