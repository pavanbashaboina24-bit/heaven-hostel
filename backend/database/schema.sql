-- Heaven Hostel: players, saved progress and the leaderboard

CREATE TABLE IF NOT EXISTS players (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    username    TEXT    NOT NULL UNIQUE COLLATE NOCASE,
    pw_hash     TEXT,                              -- NULL for guests
    is_guest    INTEGER NOT NULL DEFAULT 0,
    created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- one saved game per player (the flags and items the game keeps in the browser)
CREATE TABLE IF NOT EXISTS progress (
    player_id   INTEGER PRIMARY KEY REFERENCES players(id) ON DELETE CASCADE,
    data        TEXT    NOT NULL,                  -- JSON
    puzzles     INTEGER NOT NULL DEFAULT 0,        -- how many of the 9 puzzles are solved
    updated_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- finished games
CREATE TABLE IF NOT EXISTS scores (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    player_id   INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    seconds     INTEGER NOT NULL,                  -- time from "begin" to the ending
    deaths      INTEGER NOT NULL DEFAULT 0,
    created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_scores_seconds ON scores(seconds);
