use rusqlite::{Connection, Result as SqliteResult};
use std::fs;
use std::path::PathBuf;
use std::sync::Mutex;

/// Database wrapper with thread-safe access
pub struct Database {
    pub conn: Mutex<Connection>,
}

impl Database {
    /// Open (or create) the SQLite database at the given path and run migrations.
    pub fn open(app_data_dir: PathBuf) -> SqliteResult<Self> {
        fs::create_dir_all(&app_data_dir).expect("failed to create app data directory");

        let db_path = app_data_dir.join("personal_plan.db");
        let conn = Connection::open(&db_path)?;

        // Enable WAL mode for better concurrent read performance
        conn.pragma_update(None, "journal_mode", "WAL")?;
        conn.pragma_update(None, "foreign_keys", "ON")?;

        let db = Database {
            conn: Mutex::new(conn),
        };
        db.run_migrations()?;
        Ok(db)
    }

    /// Run versioned migrations using PRAGMA user_version.
    ///
    /// Each migration is applied in a transaction and increments user_version.
    /// New migrations are appended here and keyed by version number; existing
    /// databases skip already-applied versions on restart.
    pub(crate) fn run_migrations(&self) -> SqliteResult<()> {
        let conn = self.conn.lock().unwrap();

        let current_version: i32 = conn.pragma_query_value(None, "user_version", |r| r.get(0))?;

        // Migration 0 → 1: initial schema
        if current_version < 1 {
            conn.execute_batch(
                "
                CREATE TABLE IF NOT EXISTS categories (
                    id          TEXT PRIMARY KEY,
                    name        TEXT NOT NULL,
                    color       TEXT NOT NULL,
                    icon        TEXT DEFAULT '',
                    sort_order  INTEGER DEFAULT 0,
                    created_at  TEXT NOT NULL
                );

                CREATE TABLE IF NOT EXISTS tag_workflows (
                    id          TEXT PRIMARY KEY,
                    name        TEXT NOT NULL,
                    steps       TEXT NOT NULL,
                    created_at  TEXT NOT NULL
                );

                CREATE TABLE IF NOT EXISTS plans (
                    id                  TEXT PRIMARY KEY,
                    title               TEXT NOT NULL,
                    description         TEXT DEFAULT '',
                    category_id         TEXT REFERENCES categories(id),
                    parent_id           TEXT REFERENCES plans(id),
                    importance          INTEGER NOT NULL DEFAULT 0 CHECK(importance BETWEEN 0 AND 4),
                    urgency             INTEGER NOT NULL DEFAULT 0 CHECK(urgency BETWEEN 0 AND 4),
                    ddl                 TEXT,
                    tag_workflow_id     TEXT REFERENCES tag_workflows(id),
                    current_step_index  INTEGER DEFAULT 0,
                    period_type         TEXT CHECK(period_type IN ('daily','monthly','quarterly','yearly')),
                    period_value        TEXT,
                    status              TEXT DEFAULT 'active' CHECK(status IN ('active','completed','cancelled')),
                    created_at          TEXT NOT NULL,
                    updated_at          TEXT NOT NULL
                );

                CREATE TABLE IF NOT EXISTS plan_logs (
                    id          TEXT PRIMARY KEY,
                    plan_id     TEXT NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
                    action      TEXT NOT NULL,
                    detail      TEXT DEFAULT '',
                    created_at  TEXT NOT NULL
                );
                ",
            )?;
            conn.pragma_update(None, "user_version", 1)?;
        }

        // Migration 1 → 2: categories get a default flag
        // (预置分类不可删除但可编辑)
        if current_version < 2 {
            conn.execute_batch(
                "ALTER TABLE categories ADD COLUMN is_default INTEGER NOT NULL DEFAULT 0;",
            )?;
            conn.pragma_update(None, "user_version", 2)?;
        }

        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use rusqlite::Connection;

    fn make_db() -> Database {
        let conn = Connection::open_in_memory().unwrap();
        conn.pragma_update(None, "journal_mode", "WAL").unwrap();
        conn.pragma_update(None, "foreign_keys", "ON").unwrap();

        let db = Database {
            conn: Mutex::new(conn),
        };
        db.run_migrations().unwrap();
        db
    }

    #[test]
    fn test_migration_v2_adds_is_default_column() {
        let db = make_db();
        let conn = db.conn.lock().unwrap();
        conn.execute(
            "INSERT INTO categories (id, name, color, icon, sort_order, created_at)
             VALUES ('c-test', '测试', '#000000', '', 0, '2026-01-01T00:00:00Z')",
            [],
        )
        .unwrap();

        let is_default: bool = conn
            .query_row("SELECT is_default FROM categories WHERE id = 'c-test'", [], |r| {
                r.get(0)
            })
            .unwrap();
        assert!(!is_default, "rows created without the flag must default to non-default");
    }
}
