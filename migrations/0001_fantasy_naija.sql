CREATE TABLE IF NOT EXISTS players (
	id TEXT PRIMARY KEY,
	name TEXT NOT NULL,
	created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS game_state (
	id TEXT PRIMARY KEY,
	player_id TEXT NOT NULL,
	match_id TEXT,
	seed INTEGER NOT NULL,
	phase TEXT NOT NULL,
	state_json TEXT NOT NULL,
	created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
	updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (player_id) REFERENCES players(id)
);

CREATE TABLE IF NOT EXISTS run_results (
	id TEXT PRIMARY KEY,
	player_id TEXT NOT NULL,
	legacy_score INTEGER NOT NULL,
	ending TEXT NOT NULL,
	result_json TEXT NOT NULL,
	created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (player_id) REFERENCES players(id)
);

CREATE TABLE IF NOT EXISTS rule_documents (
	id TEXT PRIMARY KEY,
	title TEXT NOT NULL,
	version TEXT NOT NULL,
	source_url TEXT,
	source_note TEXT,
	effective_from TEXT NOT NULL,
	effective_to TEXT,
	status TEXT NOT NULL CHECK (status IN ('draft', 'active', 'superseded'))
);

CREATE TABLE IF NOT EXISTS rule_provisions (
	id TEXT PRIMARY KEY,
	document_id TEXT NOT NULL,
	title TEXT NOT NULL,
	body_text TEXT NOT NULL,
	tags_json TEXT NOT NULL DEFAULT '[]',
	params_json TEXT NOT NULL DEFAULT '{}',
	effective_from TEXT NOT NULL,
	effective_to TEXT,
	FOREIGN KEY (document_id) REFERENCES rule_documents(id)
);

CREATE TABLE IF NOT EXISTS ai_policy_cache (
	cache_key TEXT PRIMARY KEY,
	provider TEXT NOT NULL,
	response_json TEXT NOT NULL,
	created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_game_state_player_id ON game_state(player_id);
CREATE INDEX IF NOT EXISTS idx_rule_provisions_document_id ON rule_provisions(document_id);
CREATE INDEX IF NOT EXISTS idx_rule_provisions_effective ON rule_provisions(effective_from, effective_to);
