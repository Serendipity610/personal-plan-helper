use crate::db::Database;

/// Insert default categories + sample workflow + sample plans for development.
pub fn run_seed(db: &Database) {
    let conn = db.conn.lock().unwrap();

    // Only seed if the categories table is empty
    let count: i64 = conn
        .query_row("SELECT COUNT(*) FROM categories", [], |row| row.get(0))
        .unwrap_or(0);
    if count > 0 {
        return;
    }

    let now = chrono::Utc::now().to_rfc3339();

    // 4 default categories
    let categories = [
        (uuid::Uuid::new_v4().to_string(), "工作计划", "#3B82F6", "briefcase", 0),
        (uuid::Uuid::new_v4().to_string(), "学习计划", "#10B981", "book-open", 1),
        (uuid::Uuid::new_v4().to_string(), "日常计划", "#F59E0B", "calendar", 2),
        (uuid::Uuid::new_v4().to_string(), "个人任务", "#8B5CF6", "user", 3),
    ];

    for (id, name, color, icon, sort_order) in &categories {
        conn.execute(
            "INSERT INTO categories (id, name, color, icon, sort_order, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
            rusqlite::params![id, name, color, icon, sort_order, now],
        )
        .unwrap();
    }

    // 1 sample workflow
    let workflow_id = uuid::Uuid::new_v4().to_string();
    let steps = serde_json::json!([
        "需求分析", "方案设计", "代码开发", "测试验证", "已合入dev", "已合入主干", "闭环"
    ])
    .to_string();
    conn.execute(
        "INSERT INTO tag_workflows (id, name, steps, created_at) VALUES (?1, ?2, ?3, ?4)",
        rusqlite::params![workflow_id, "开发任务流程", steps, now],
    )
    .unwrap();

    // 3 sample plans
    let sample_plans = [
        ("完成数据库模块开发", "实现 SQLite 初始化与 migration", &categories[0].0, 4, 3, Some("2026-08-10T18:00:00+08:00"), Some(&workflow_id)),
        ("学习 Rust 异步编程", "阅读 Tokio 官方教程", &categories[1].0, 3, 2, None, None),
        ("每周运动计划", "跑步 3 次，每次 30 分钟", &categories[3].0, 2, 1, None, None),
    ];

    for (title, desc, cat_id, importance, urgency, ddl, wf_id) in &sample_plans {
        let plan_id = uuid::Uuid::new_v4().to_string();
        conn.execute(
            "INSERT INTO plans (id, title, description, category_id, importance, urgency, ddl, tag_workflow_id, current_step_index, status, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, 0, 'active', ?9, ?9)",
            rusqlite::params![plan_id, title, desc, cat_id, importance, urgency, *ddl, *wf_id, now],
        )
        .unwrap();
    }
}
