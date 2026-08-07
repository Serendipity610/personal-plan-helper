use crate::db::Database;
use serde::Serialize;
use tauri::State;

// ============================================================
// Response types
// ============================================================

/// 看板统计摘要
#[derive(Debug, Clone, Serialize)]
pub struct DashboardStats {
    pub total_plans: i64,
    pub completed_plans: i64,
    pub completion_rate: f64,
    pub today_pending: i64,
    pub overdue_count: i64,
    pub week_change: i64,
}

/// 每日完成趋势数据点
#[derive(Debug, Clone, Serialize)]
pub struct CompletionTrendPoint {
    pub date: String,
    pub count: i64,
}

/// 分布数据项（紧急度分布、分类分布共用）
#[derive(Debug, Clone, Serialize)]
pub struct DistributionItem {
    pub key: String,
    pub label: String,
    pub count: i64,
    pub color: String,
}

// ============================================================
// Tauri commands
// ============================================================

/// 获取看板统计卡片数据
#[tauri::command]
pub fn get_dashboard_stats(db: State<'_, Database>) -> Result<DashboardStats, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let today = chrono::Utc::now().format("%Y-%m-%d").to_string();

    // total: active + completed (excludes cancelled)
    let total_plans: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM plans WHERE status != 'cancelled'",
            [],
            |r| r.get(0),
        )
        .map_err(|e| e.to_string())?;

    let completed_plans: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM plans WHERE status = 'completed'",
            [],
            |r| r.get(0),
        )
        .map_err(|e| e.to_string())?;

    let completion_rate: f64 = if total_plans > 0 {
        (completed_plans as f64 / total_plans as f64) * 100.0
    } else {
        0.0
    };

    let today_pending: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM plans WHERE status = 'active' AND ddl IS NOT NULL AND date(ddl) = date(?1)",
            rusqlite::params![today],
            |r| r.get(0),
        )
        .map_err(|e| e.to_string())?;

    let overdue_count: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM plans WHERE status = 'active' AND ddl IS NOT NULL AND date(ddl) < date(?1)",
            rusqlite::params![today],
            |r| r.get(0),
        )
        .map_err(|e| e.to_string())?;

    // week_change: new plans in last 7 days (含今天) minus new plans 8-14 days ago
    let this_week: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM plans WHERE date(created_at) >= date(?1, '-6 days')",
            rusqlite::params![today],
            |r| r.get(0),
        )
        .map_err(|e| e.to_string())?;
    let last_week: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM plans WHERE date(created_at) >= date(?1, '-13 days') AND date(created_at) < date(?1, '-6 days')",
            rusqlite::params![today],
            |r| r.get(0),
        )
        .map_err(|e| e.to_string())?;

    Ok(DashboardStats {
        total_plans,
        completed_plans,
        completion_rate,
        today_pending,
        overdue_count,
        week_change: this_week - last_week,
    })
}

/// 获取近 N 天每日完成趋势（按 updated_at 近似统计完成时间）
#[tauri::command]
pub fn get_completion_trend(
    db: State<'_, Database>,
    days: i32,
) -> Result<Vec<CompletionTrendPoint>, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let today = chrono::Utc::now().format("%Y-%m-%d").to_string();

    let mut trend = Vec::with_capacity(days as usize);
    for i in (0..days).rev() {
        let date_label = conn
            .query_row(
                "SELECT date(?1, ?2)",
                rusqlite::params![today, format!("-{} days", i)],
                |r| r.get::<_, String>(0),
            )
            .map_err(|e| e.to_string())?;

        let count: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM plans WHERE status = 'completed' AND date(updated_at) = date(?1, ?2)",
                rusqlite::params![today, format!("-{} days", i)],
                |r| r.get(0),
            )
            .map_err(|e| e.to_string())?;

        trend.push(CompletionTrendPoint {
            date: date_label,
            count,
        });
    }

    Ok(trend)
}

/// 获取紧急度分布（按整数层级 0-4 分组计数，排除已取消计划，可按时间范围过滤）
#[tauri::command]
pub fn get_urgency_distribution(
    db: State<'_, Database>,
    days: i32,
) -> Result<Vec<DistributionItem>, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let today = chrono::Utc::now().format("%Y-%m-%d").to_string();
    let days_offset = format!("-{} days", days - 1);

    // SQLite FLOOR: for non-negative values, floor = CAST(REAL AS INTEGER)
    // Group by integer floor of urgency, fill all levels 0-4
    let mut dist = Vec::new();
    for level in 0..=4 {
        let count: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM plans WHERE CAST(urgency AS INTEGER) = ?1 AND status != 'cancelled' AND date(created_at) >= date(?2, ?3)",
                rusqlite::params![level, today, days_offset],
                |r| r.get(0),
            )
            .map_err(|e| e.to_string())?;

        dist.push(DistributionItem {
            key: level.to_string(),
            label: format!("紧急度 {}", level),
            count,
            color: String::new(),
        });
    }

    Ok(dist)
}

/// 获取分类分布（按分类统计计划数，排除已取消计划，可按时间范围过滤）
#[tauri::command]
pub fn get_category_distribution(
    db: State<'_, Database>,
    days: i32,
) -> Result<Vec<DistributionItem>, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let today = chrono::Utc::now().format("%Y-%m-%d").to_string();
    let days_offset = format!("-{} days", days - 1);

    let mut stmt = conn
        .prepare(
            "SELECT COALESCE(c.id, ''), COALESCE(c.name, '未分类'), COALESCE(c.color, '#6B7280'), COUNT(p.id) \
             FROM plans p LEFT JOIN categories c ON p.category_id = c.id \
             WHERE p.status != 'cancelled' AND date(p.created_at) >= date(?1, ?2) \
             GROUP BY p.category_id \
             ORDER BY COUNT(p.id) DESC",
        )
        .map_err(|e| e.to_string())?;

    let dist = stmt
        .query_map(rusqlite::params![today, days_offset], |r| {
            Ok(DistributionItem {
                key: r.get(0)?,
                label: r.get(1)?,
                color: r.get(2)?,
                count: r.get(3)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    Ok(dist)
}

// ============================================================
// Tests
// ============================================================

#[cfg(test)]
mod tests {
    use super::*;
    use rusqlite::Connection;
    use std::sync::Mutex;

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

    fn seed_test_data(db: &Database) {
        let conn = db.conn.lock().unwrap();
        let today = chrono::Utc::now().format("%Y-%m-%dT00:00:00+00:00").to_string();

        // Insert categories
        conn.execute(
            "INSERT INTO categories (id, name, color, icon, sort_order, is_default, created_at) VALUES ('cat-1', '工作', '#3B82F6', 'briefcase', 0, 0, '2026-01-01T00:00:00Z')",
            [],
        ).unwrap();
        conn.execute(
            "INSERT INTO categories (id, name, color, icon, sort_order, is_default, created_at) VALUES ('cat-2', '学习', '#10B981', 'book', 1, 0, '2026-01-01T00:00:00Z')",
            [],
        ).unwrap();

        // Plan 1: active, ddl today, urgency=4, cat work, created today
        conn.execute(
            "INSERT INTO plans (id, title, description, category_id, importance, urgency, ddl, status, created_at, updated_at) VALUES ('p-1', '今日任务', '', 'cat-1', 3, 4, ?1, 'active', ?1, ?1)",
            rusqlite::params![today],
        ).unwrap();

        // Plan 2: active, ddl yesterday (overdue), urgency=2, cat work
        let yesterday = chrono::Utc::now()
            .checked_sub_signed(chrono::Duration::days(1))
            .unwrap()
            .format("%Y-%m-%dT00:00:00+00:00")
            .to_string();
        conn.execute(
            "INSERT INTO plans (id, title, description, category_id, importance, urgency, ddl, status, created_at, updated_at) VALUES ('p-2', '逾期任务', '', 'cat-1', 2, 2, ?1, 'active', ?2, ?2)",
            rusqlite::params![yesterday, yesterday],
        ).unwrap();

        // Plan 3: completed, urgency=0, cat study, created 3 days ago
        let three_days_ago = chrono::Utc::now()
            .checked_sub_signed(chrono::Duration::days(3))
            .unwrap()
            .format("%Y-%m-%dT00:00:00+00:00")
            .to_string();
        conn.execute(
            "INSERT INTO plans (id, title, description, category_id, importance, urgency, ddl, status, created_at, updated_at) VALUES ('p-3', '已完成任务', '', 'cat-2', 1, 0, NULL, 'completed', ?1, ?1)",
            rusqlite::params![three_days_ago],
        ).unwrap();

        // Plan 4: active, no ddl, urgency=2.5, no category, created 10 days ago
        let ten_days_ago = chrono::Utc::now()
            .checked_sub_signed(chrono::Duration::days(10))
            .unwrap()
            .format("%Y-%m-%dT00:00:00+00:00")
            .to_string();
        conn.execute(
            "INSERT INTO plans (id, title, description, importance, urgency, ddl, status, created_at, updated_at) VALUES ('p-4', '无分类任务', '', 3, 2.5, NULL, 'active', ?1, ?1)",
            rusqlite::params![ten_days_ago],
        ).unwrap();

        // Plan 5: cancelled, urgency=1, cat study, created 5 days ago
        let five_days_ago = chrono::Utc::now()
            .checked_sub_signed(chrono::Duration::days(5))
            .unwrap()
            .format("%Y-%m-%dT00:00:00+00:00")
            .to_string();
        conn.execute(
            "INSERT INTO plans (id, title, description, category_id, importance, urgency, ddl, status, created_at, updated_at) VALUES ('p-5', '已取消任务', '', 'cat-2', 1, 1, NULL, 'cancelled', ?1, ?1)",
            rusqlite::params![five_days_ago],
        ).unwrap();
    }

    // ── get_dashboard_stats ─────────────────────────────────

    #[test]
    fn test_dashboard_stats_counts() {
        let db = make_db();
        seed_test_data(&db);

        let conn = db.conn.lock().unwrap();

        // total_plans: active(3) + completed(1) = 4 (cancelled excluded)
        let total: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM plans WHERE status != 'cancelled'",
                [],
                |r| r.get(0),
            )
            .unwrap();
        assert_eq!(total, 4);

        // completed_plans
        let completed: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM plans WHERE status = 'completed'",
                [],
                |r| r.get(0),
            )
            .unwrap();
        assert_eq!(completed, 1);

        // completion_rate: 1/4 = 25%
        assert!((25.0 - (completed as f64 / total as f64) * 100.0).abs() < 0.01);

        // today_pending: plan with ddl today AND status active
        let today = chrono::Utc::now().format("%Y-%m-%d").to_string();
        let today_pending: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM plans WHERE status = 'active' AND ddl IS NOT NULL AND date(ddl) = date(?1)",
                rusqlite::params![today],
                |r| r.get(0),
            )
            .unwrap();
        assert_eq!(today_pending, 1, "p-1 has ddl today and is active");

        // overdue_count: p-2 has ddl yesterday and is active
        let overdue: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM plans WHERE status = 'active' AND ddl IS NOT NULL AND date(ddl) < date(?1)",
                rusqlite::params![today],
                |r| r.get(0),
            )
            .unwrap();
        assert_eq!(overdue, 1, "p-2 is overdue");
    }

    #[test]
    fn test_dashboard_stats_empty() {
        let db = make_db();
        // no seed data
        let conn = db.conn.lock().unwrap();

        let total: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM plans WHERE status != 'cancelled'",
                [],
                |r| r.get(0),
            )
            .unwrap();
        assert_eq!(total, 0);

        let completed: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM plans WHERE status = 'completed'",
                [],
                |r| r.get(0),
            )
            .unwrap();
        assert_eq!(completed, 0);

        let today = chrono::Utc::now().format("%Y-%m-%d").to_string();
        let today_pending: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM plans WHERE status = 'active' AND ddl IS NOT NULL AND date(ddl) = date(?1)",
                rusqlite::params![today],
                |r| r.get(0),
            )
            .unwrap();
        assert_eq!(today_pending, 0);

        let overdue: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM plans WHERE status = 'active' AND ddl IS NOT NULL AND date(ddl) < date(?1)",
                rusqlite::params![today],
                |r| r.get(0),
            )
            .unwrap();
        assert_eq!(overdue, 0);
    }

    #[test]
    fn test_dashboard_stats_week_change() {
        let db = make_db();
        seed_test_data(&db);

        let conn = db.conn.lock().unwrap();
        let today = chrono::Utc::now().format("%Y-%m-%d").to_string();

        // this_week: created within last 7 days (including today)
        // >= today-6 days: p-1(today), p-2(yesterday), p-3(3days ago), p-5(5days ago) = 4
        let this_week: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM plans WHERE date(created_at) >= date(?1, '-6 days')",
                rusqlite::params![today],
                |r| r.get(0),
            )
            .unwrap();
        // last_week: created 7-13 days ago
        // >= today-13 AND < today-6: p-4(10days ago) = 1
        let last_week: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM plans WHERE date(created_at) >= date(?1, '-13 days') AND date(created_at) < date(?1, '-6 days')",
                rusqlite::params![today],
                |r| r.get(0),
            )
            .unwrap();

        assert_eq!(this_week, 4, "p-1, p-2, p-3, p-5 are within last 7 days");
        assert_eq!(last_week, 1, "p-4 is 10 days ago (7-13 day range)");
    }

    // ── get_completion_trend ─────────────────────────────────

    #[test]
    fn test_completion_trend_returns_days_entries() {
        let db = make_db();
        seed_test_data(&db);

        let conn = db.conn.lock().unwrap();
        let today = chrono::Utc::now().format("%Y-%m-%d").to_string();

        // Only p-3 is completed (updated_at = 3 days ago)
        let day_offset = 3;
        let count: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM plans WHERE status = 'completed' AND date(updated_at) = date(?1, ?2)",
                rusqlite::params![today, format!("-{} days", day_offset)],
                |r| r.get(0),
            )
            .unwrap();
        assert_eq!(count, 1, "p-3 was completed 3 days ago");
    }

    #[test]
    fn test_completion_trend_empty_when_no_completions() {
        let db = make_db();
        // no data
        let conn = db.conn.lock().unwrap();
        let today = chrono::Utc::now().format("%Y-%m-%d").to_string();

        for i in 0..7 {
            let count: i64 = conn
                .query_row(
                    "SELECT COUNT(*) FROM plans WHERE status = 'completed' AND date(updated_at) = date(?1, ?2)",
                    rusqlite::params![today, format!("-{} days", i)],
                    |r| r.get(0),
                )
                .unwrap();
            assert_eq!(count, 0);
        }
    }

    // ── get_urgency_distribution ─────────────────────────────

    #[test]
    fn test_urgency_distribution_groups_by_floor() {
        let db = make_db();
        seed_test_data(&db);

        let conn = db.conn.lock().unwrap();

        // urgency values: p-1=4, p-2=2, p-3=0, p-4=2.5, p-5=1 (cancelled — excluded)
        // floor: 4→bucket4, 2→bucket2, 0→bucket0, 2.5→bucket2, 1→bucket1(excluded)
        // Use days=365 to include all seed data (same as the command signature)
        let today = chrono::Utc::now().format("%Y-%m-%d").to_string();
        let counts: Vec<(i64, i64)> = conn
            .prepare("SELECT CAST(urgency AS INTEGER), COUNT(*) FROM plans WHERE status != 'cancelled' AND date(created_at) >= date(?1, '-364 days') GROUP BY 1 ORDER BY 1")
            .unwrap()
            .query_map(rusqlite::params![today], |r| Ok((r.get(0)?, r.get(1)?)))
            .unwrap()
            .collect::<Result<_, _>>()
            .unwrap();

        // bucket 0: p-3 → 1
        // bucket 1: excluded (p-5 cancelled) → no entry
        // bucket 2: p-2, p-4 → 2
        // bucket 4: p-1 → 1
        assert_eq!(counts.len(), 3); // buckets 0, 2, 4 (bucket 1 excluded)
        assert!(counts.iter().any(|(l, c)| *l == 0 && *c == 1));
        assert!(counts.iter().any(|(l, c)| *l == 2 && *c == 2));
        assert!(counts.iter().any(|(l, c)| *l == 4 && *c == 1));
    }

    #[test]
    fn test_urgency_distribution_includes_empty_buckets() {
        let db = make_db();
        seed_test_data(&db);

        let conn = db.conn.lock().unwrap();
        // Buckets 0-4 should all be present, even if count is 0
        // bucket 3 is empty (no plan with urgency 3-3.99)
        let today = chrono::Utc::now().format("%Y-%m-%d").to_string();
        let level3_count: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM plans WHERE CAST(urgency AS INTEGER) = 3 AND status != 'cancelled' AND date(created_at) >= date(?1, '-364 days')",
                rusqlite::params![today],
                |r| r.get(0),
            )
            .unwrap();
        assert_eq!(level3_count, 0);
    }

    #[test]
    fn test_distributions_exclude_cancelled() {
        let db = make_db();
        seed_test_data(&db);

        let conn = db.conn.lock().unwrap();
        let today = chrono::Utc::now().format("%Y-%m-%d").to_string();

        // Urgency distribution: bucket 1 has only p-5 (cancelled) → should be 0
        let urgency_bucket1: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM plans WHERE CAST(urgency AS INTEGER) = 1 AND status != 'cancelled' AND date(created_at) >= date(?1, '-364 days')",
                rusqlite::params![today],
                |r| r.get(0),
            )
            .unwrap();
        assert_eq!(urgency_bucket1, 0, "p-5 is cancelled, bucket 1 should be 0");

        // Category distribution: cat-2 has p-3(completed) + p-5(cancelled) → 1
        let cat_study: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM plans p WHERE p.category_id = 'cat-2' AND p.status != 'cancelled' AND date(p.created_at) >= date(?1, '-364 days')",
                rusqlite::params![today],
                |r| r.get(0),
            )
            .unwrap();
        assert_eq!(cat_study, 1, "only p-3 should count for cat-2 after excluding cancelled p-5");
    }

    // ── get_category_distribution ────────────────────────────

    #[test]
    fn test_category_distribution_counts() {
        let db = make_db();
        seed_test_data(&db);

        let conn = db.conn.lock().unwrap();

        // cat-1 (工作): p-1, p-2 = 2 plans
        // cat-2 (学习): p-3 = 1 plan (p-5 cancelled → excluded)
        // uncategorized: p-4 = 1 plan
        let today = chrono::Utc::now().format("%Y-%m-%d").to_string();
        let dist: Vec<(String, i64)> = conn
            .prepare(
                "SELECT COALESCE(c.name, '未分类'), COUNT(p.id) FROM plans p LEFT JOIN categories c ON p.category_id = c.id WHERE p.status != 'cancelled' AND date(p.created_at) >= date(?1, '-364 days') GROUP BY p.category_id ORDER BY COUNT(p.id) DESC",
            )
            .unwrap()
            .query_map(rusqlite::params![today], |r| Ok((r.get(0)?, r.get(1)?)))
            .unwrap()
            .collect::<Result<_, _>>()
            .unwrap();

        assert_eq!(dist.len(), 3);
        assert!(dist.iter().any(|(name, count)| name == "工作" && *count == 2));
        assert!(dist.iter().any(|(name, count)| name == "学习" && *count == 1));
        assert!(dist.iter().any(|(name, count)| name == "未分类" && *count == 1));
    }

    #[test]
    fn test_category_distribution_handles_no_categories() {
        let db = make_db();
        let conn = db.conn.lock().unwrap();

        // Insert a plan with no category
        let now = chrono::Utc::now().to_rfc3339();
        conn.execute(
            "INSERT INTO plans (id, title, description, importance, urgency, status, created_at, updated_at) VALUES ('p-nocat', '无分类', '', 1, 1, 'active', ?1, ?1)",
            rusqlite::params![now],
        ).unwrap();

        let today = chrono::Utc::now().format("%Y-%m-%d").to_string();
        let dist: Vec<(String, i64)> = conn
            .prepare(
                "SELECT COALESCE(c.name, '未分类'), COUNT(p.id) FROM plans p LEFT JOIN categories c ON p.category_id = c.id WHERE p.status != 'cancelled' AND date(p.created_at) >= date(?1, '-364 days') GROUP BY p.category_id",
            )
            .unwrap()
            .query_map(rusqlite::params![today], |r| Ok((r.get(0)?, r.get(1)?)))
            .unwrap()
            .collect::<Result<_, _>>()
            .unwrap();

        assert_eq!(dist.len(), 1);
        assert_eq!(dist[0].0, "未分类");
        assert_eq!(dist[0].1, 1);
    }

    #[test]
    fn test_distributions_respect_days_filter() {
        let db = make_db();
        seed_test_data(&db);

        let conn = db.conn.lock().unwrap();
        let today = chrono::Utc::now().format("%Y-%m-%d").to_string();

        // With days=7 (last 7 days including today):
        // p-1(today), p-2(yesterday, 1d), p-3(3d ago), p-5(5d ago, cancelled→out), p-4(10d ago→out)
        // non-cancelled: p-1, p-2, p-3
        // urgency buckets: p-1=4, p-2=2, p-3=0

        let urgency_7d: Vec<(i64, i64)> = conn
            .prepare("SELECT CAST(urgency AS INTEGER), COUNT(*) FROM plans WHERE status != 'cancelled' AND date(created_at) >= date(?1, '-6 days') GROUP BY 1 ORDER BY 1")
            .unwrap()
            .query_map(rusqlite::params![today], |r| Ok((r.get(0)?, r.get(1)?)))
            .unwrap()
            .collect::<Result<_, _>>()
            .unwrap();
        // buckets: 0=1(p-3), 2=1(p-2), 4=1(p-1)
        assert_eq!(urgency_7d.len(), 3);
        assert!(urgency_7d.iter().any(|(l, c)| *l == 0 && *c == 1));
        assert!(urgency_7d.iter().any(|(l, c)| *l == 2 && *c == 1));
        assert!(urgency_7d.iter().any(|(l, c)| *l == 4 && *c == 1));

        // With days=90 (last 90 days): p-4 (10d ago) now included
        let urgency_90d: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM plans WHERE CAST(urgency AS INTEGER) = 2 AND status != 'cancelled' AND date(created_at) >= date(?1, '-89 days')",
                rusqlite::params![today],
                |r| r.get(0),
            )
            .unwrap();
        assert_eq!(urgency_90d, 2, "p-2 and p-4 have urgency 2 in 90-day range");

        // p-4 (10 days ago, uncategorized) excluded in 7-day range
        let uncat_7d: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM plans p WHERE p.category_id IS NULL AND p.status != 'cancelled' AND date(p.created_at) >= date(?1, '-6 days')",
                rusqlite::params![today],
                |r| r.get(0),
            )
            .unwrap();
        assert_eq!(uncat_7d, 0, "p-4 (10 days ago) excluded from 7-day range");
    }
}
