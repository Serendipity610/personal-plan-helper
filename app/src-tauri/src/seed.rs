use crate::db::Database;

/// Stable UUIDs (v4 style) for seed entities so restart is truly idempotent.
const CAT_WORK: &str = "a1b2c3d4-0001-4000-8000-000000000001";
const CAT_STUDY: &str = "a1b2c3d4-0001-4000-8000-000000000002";
const CAT_DAILY: &str = "a1b2c3d4-0001-4000-8000-000000000003";
const CAT_PERSONAL: &str = "a1b2c3d4-0001-4000-8000-000000000004";
const WF_DEV: &str = "b2c3d4e5-0001-4000-8000-000000000001";
const PLAN_DB: &str = "c3d4e5f6-0001-4000-8000-000000000001";
const PLAN_RUST: &str = "c3d4e5f6-0001-4000-8000-000000000002";
const PLAN_SPORT: &str = "c3d4e5f6-0001-4000-8000-000000000003";

/// Insert default categories + sample workflow + sample plans for development.
/// Runs in a single transaction with INSERT OR IGNORE for true idempotency.
/// Returns Ok(()) on success so the caller (setup) can handle errors gracefully.
pub fn run_seed(db: &Database) -> Result<(), String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let now = chrono::Utc::now().to_rfc3339();

    // Single transaction — either all seed entries land or none do
    conn.execute("BEGIN", []).map_err(|e| e.to_string())?;

    let result = (|| -> Result<(), rusqlite::Error> {
        // 4 default categories — INSERT OR IGNORE with stable IDs
        conn.execute(
            "INSERT OR IGNORE INTO categories (id, name, color, icon, sort_order, created_at) VALUES (?1,?2,?3,?4,?5,?6)",
            rusqlite::params![CAT_WORK, "工作计划", "#3B82F6", "briefcase", 0, now],
        )?;
        conn.execute(
            "INSERT OR IGNORE INTO categories (id, name, color, icon, sort_order, created_at) VALUES (?1,?2,?3,?4,?5,?6)",
            rusqlite::params![CAT_STUDY, "学习计划", "#10B981", "book-open", 1, now],
        )?;
        conn.execute(
            "INSERT OR IGNORE INTO categories (id, name, color, icon, sort_order, created_at) VALUES (?1,?2,?3,?4,?5,?6)",
            rusqlite::params![CAT_DAILY, "日常计划", "#F59E0B", "calendar", 2, now],
        )?;
        conn.execute(
            "INSERT OR IGNORE INTO categories (id, name, color, icon, sort_order, created_at) VALUES (?1,?2,?3,?4,?5,?6)",
            rusqlite::params![CAT_PERSONAL, "个人任务", "#8B5CF6", "user", 3, now],
        )?;

        // 1 sample workflow
        let steps = serde_json::json!([
            "需求分析",
            "方案设计",
            "代码开发",
            "测试验证",
            "已合入dev",
            "已合入主干",
            "闭环"
        ])
        .to_string();
        conn.execute(
            "INSERT OR IGNORE INTO tag_workflows (id, name, steps, created_at) VALUES (?1,?2,?3,?4)",
            rusqlite::params![WF_DEV, "开发任务流程", steps, now],
        )?;

        // 3 sample plans
        conn.execute(
            "INSERT OR IGNORE INTO plans (id, title, description, category_id, importance, urgency, ddl, tag_workflow_id, current_step_index, status, created_at, updated_at) VALUES (?1,?2,?3,?4,?5,?6,?7,?8,0,'active',?9,?9)",
            rusqlite::params![PLAN_DB, "完成数据库模块开发", "实现 SQLite 初始化与 migration", CAT_WORK, 4, 3, "2026-08-10T18:00:00+08:00", WF_DEV, now],
        )?;
        conn.execute(
            "INSERT OR IGNORE INTO plans (id, title, description, category_id, importance, urgency, ddl, tag_workflow_id, current_step_index, status, created_at, updated_at) VALUES (?1,?2,?3,?4,?5,?6,?7,?8,0,'active',?9,?9)",
            rusqlite::params![PLAN_RUST, "学习 Rust 异步编程", "阅读 Tokio 官方教程", CAT_STUDY, 3, 2, "", "", now],
        )?;
        conn.execute(
            "INSERT OR IGNORE INTO plans (id, title, description, category_id, importance, urgency, ddl, tag_workflow_id, current_step_index, status, created_at, updated_at) VALUES (?1,?2,?3,?4,?5,?6,?7,?8,0,'active',?9,?9)",
            rusqlite::params![PLAN_SPORT, "每周运动计划", "跑步 3 次，每次 30 分钟", CAT_PERSONAL, 2, 1, "", "", now],
        )?;

        Ok(())
    })();

    match result {
        Ok(()) => {
            conn.execute("COMMIT", []).map_err(|e| e.to_string())?;
            Ok(())
        }
        Err(e) => {
            // Best-effort rollback — don't panic, just return the error
            let _ = conn.execute("ROLLBACK", []);
            Err(e.to_string())
        }
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

        // Run migrations so tables exist
        let db = Database {
            conn: std::sync::Mutex::new(conn),
        };
        db.run_migrations().unwrap();
        db
    }

    fn count_table(db: &Database, table: &str) -> i64 {
        let conn = db.conn.lock().unwrap();
        let sql = format!("SELECT COUNT(*) FROM {}", table);
        conn.query_row(&sql, [], |r| r.get(0)).unwrap()
    }

    #[test]
    fn test_seed_inserts_correct_counts() {
        let db = make_db();
        run_seed(&db).unwrap();

        assert_eq!(count_table(&db, "categories"), 4);
        assert_eq!(count_table(&db, "tag_workflows"), 1);
        assert_eq!(count_table(&db, "plans"), 3);
    }

    #[test]
    fn test_seed_is_idempotent() {
        let db = make_db();
        run_seed(&db).unwrap();
        run_seed(&db).unwrap();

        // Counts must not change after second run
        assert_eq!(count_table(&db, "categories"), 4);
        assert_eq!(count_table(&db, "tag_workflows"), 1);
        assert_eq!(count_table(&db, "plans"), 3);
    }

    #[test]
    fn test_seed_nullable_fields_are_null() {
        let db = make_db();
        run_seed(&db).unwrap();

        let conn = db.conn.lock().unwrap();
        // PLAN_RUST should have NULL ddl and tag_workflow_id
        let (ddl, wf): (Option<String>, Option<String>) = conn
            .query_row(
                "SELECT ddl, tag_workflow_id FROM plans WHERE id = ?1",
                rusqlite::params![PLAN_RUST],
                |r| Ok((r.get(0)?, r.get(1)?)),
            )
            .unwrap();
        assert!(ddl.is_none(), "ddl should be NULL for PLAN_RUST");
        assert!(wf.is_none(), "tag_workflow_id should be NULL for PLAN_RUST");
    }
}
