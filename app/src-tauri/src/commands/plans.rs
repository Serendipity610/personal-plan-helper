use crate::db::Database;
use crate::models::{CreatePlanRequest, Plan, UpdatePlanRequest};
use rusqlite::types::ToSql;
use tauri::State;

/// Create a new plan
#[tauri::command]
pub fn create_plan(db: State<'_, Database>, request: CreatePlanRequest) -> Result<Plan, String> {
    create_plan_inner(db.inner(), request)
}

pub(crate) fn create_plan_inner(db: &Database, request: CreatePlanRequest) -> Result<Plan, String> {
    validate_score(request.importance, "importance")?;
    validate_score(request.urgency, "urgency")?;

    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let id = uuid::Uuid::new_v4().to_string();
    let now = chrono::Utc::now().to_rfc3339();

    conn.execute(
        "INSERT INTO plans (id, title, description, category_id, parent_id, importance, urgency, ddl, tag_workflow_id, current_step_index, period_type, period_value, status, created_at, updated_at, completed_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?14, NULL)",
        rusqlite::params![
            id,
            request.title,
            request.description,
            request.category_id,
            request.parent_id,
            request.importance,
            request.urgency,
            request.ddl,
            request.tag_workflow_id,
            request.current_step_index,
            request.period_type,
            request.period_value,
            request.status,
            now,
        ],
    )
    .map_err(|e| e.to_string())?;

    get_plan_internal(&conn, &id)
}

/// Get a single plan by id
#[tauri::command]
pub fn get_plan(db: State<'_, Database>, id: String) -> Result<Plan, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    get_plan_internal(&conn, &id)
}

/// Update an existing plan.
/// Fields use tri-state Option<Option<T>>:
///   - outer None        → field not in JSON → skip
///   - outer Some(None)  → explicit null → clear to NULL
///   - outer Some(Some)  → set to value
#[tauri::command]
pub fn update_plan(db: State<'_, Database>, request: UpdatePlanRequest) -> Result<Plan, String> {
    update_plan_inner(db.inner(), request)
}

pub(crate) fn update_plan_inner(db: &Database, request: UpdatePlanRequest) -> Result<Plan, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let now = chrono::Utc::now().to_rfc3339();
    let old_status: String = conn
        .query_row(
            "SELECT status FROM plans WHERE id = ?1",
            rusqlite::params![request.id],
            |row| row.get(0),
        )
        .map_err(|e| e.to_string())?;

    let mut sets: Vec<String> = Vec::new();
    let mut params: Vec<Box<dyn ToSql>> = Vec::new();

    // Simple optional fields — Some(v) = set, None = skip
    if let Some(v) = request.title {
        sets.push(format!("title = ?{}", sets.len() + 1));
        params.push(Box::new(v));
    }
    if let Some(v) = request.description {
        sets.push(format!("description = ?{}", sets.len() + 1));
        params.push(Box::new(v));
    }
    if let Some(v) = request.importance {
        validate_score(v, "importance")?;
        sets.push(format!("importance = ?{}", sets.len() + 1));
        params.push(Box::new(v));
    }
    if let Some(v) = request.urgency {
        validate_score(v, "urgency")?;
        sets.push(format!("urgency = ?{}", sets.len() + 1));
        params.push(Box::new(v));
    }
    if let Some(v) = request.current_step_index {
        sets.push(format!("current_step_index = ?{}", sets.len() + 1));
        params.push(Box::new(v));
    }
    if let Some(ref v) = request.status {
        sets.push(format!("status = ?{}", sets.len() + 1));
        params.push(Box::new(v.clone()));
        if old_status != *v {
            if v == "completed" {
                sets.push(format!("completed_at = ?{}", sets.len() + 1));
                params.push(Box::new(now.clone()));
            } else if old_status == "completed" {
                sets.push(format!("completed_at = ?{}", sets.len() + 1));
                params.push(Box::new(None::<String>));
            }
        }
    }

    // Nullable fields — tri-state: absent / null (clear) / value (set)
    apply_nullable(&mut sets, &mut params, "category_id", &request.category_id);
    apply_nullable(&mut sets, &mut params, "parent_id", &request.parent_id);
    apply_nullable(&mut sets, &mut params, "ddl", &request.ddl);
    apply_nullable(
        &mut sets,
        &mut params,
        "tag_workflow_id",
        &request.tag_workflow_id,
    );
    apply_nullable(&mut sets, &mut params, "period_type", &request.period_type);
    apply_nullable(
        &mut sets,
        &mut params,
        "period_value",
        &request.period_value,
    );

    if sets.is_empty() {
        return get_plan_internal(&conn, &request.id);
    }

    // Always bump updated_at
    sets.push(format!("updated_at = ?{}", sets.len() + 1));
    params.push(Box::new(now));

    let id_idx = sets.len() + 1;
    params.push(Box::new(request.id.clone()));

    let sql = format!(
        "UPDATE plans SET {} WHERE id = ?{}",
        sets.join(", "),
        id_idx
    );

    let param_refs: Vec<&dyn ToSql> = params.iter().map(|p| p.as_ref()).collect();
    conn.execute(&sql, param_refs.as_slice())
        .map_err(|e| e.to_string())?;

    get_plan_internal(&conn, &request.id)
}

/// Delete a plan by id
#[tauri::command]
pub fn delete_plan(db: State<'_, Database>, id: String) -> Result<bool, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let affected = conn
        .execute("DELETE FROM plans WHERE id = ?1", rusqlite::params![id])
        .map_err(|e| e.to_string())?;
    Ok(affected > 0)
}

/// List all plans, optionally filtered by status and/or category_id
#[tauri::command]
pub fn list_plans(
    db: State<'_, Database>,
    status: Option<String>,
    category_id: Option<String>,
) -> Result<Vec<Plan>, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;

    let base_sql = "SELECT id, title, description, category_id, parent_id, \
                    importance, urgency, ddl, tag_workflow_id, current_step_index, \
                    period_type, period_value, status, created_at, updated_at, completed_at \
                    FROM plans WHERE 1=1";
    let mut clauses = Vec::new();
    let mut params: Vec<String> = Vec::new();

    if let Some(ref s) = status {
        clauses.push(format!(" AND status = ?{}", params.len() + 1));
        params.push(s.clone());
    }
    if let Some(ref c) = category_id {
        clauses.push(format!(" AND category_id = ?{}", params.len() + 1));
        params.push(c.clone());
    }

    let sql = format!("{}{} ORDER BY created_at DESC", base_sql, clauses.join(""));

    let param_refs: Vec<&dyn ToSql> = params.iter().map(|s| s as &dyn ToSql).collect();

    let mut stmt = conn.prepare(&sql).map_err(|e| e.to_string())?;
    let plans = stmt
        .query_map(param_refs.as_slice(), row_to_plan)
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    Ok(plans)
}

// --- Internal helpers ---

/// 重要度/紧急度取值范围 0-4（支持半格小数）
fn validate_score(score: f64, field: &str) -> Result<(), String> {
    if (0.0..=4.0).contains(&score) {
        Ok(())
    } else {
        Err(format!("{field} 必须在 0-4 之间，收到 {score}"))
    }
}

/// Apply a tri-state nullable field to the UPDATE clause.
fn apply_nullable(
    sets: &mut Vec<String>,
    params: &mut Vec<Box<dyn ToSql>>,
    col: &str,
    field: &Option<Option<String>>,
) {
    match field {
        None => {} // key absent — skip
        Some(None) => {
            // explicit null — clear to NULL
            sets.push(format!("{} = ?{}", col, params.len() + 1));
            params.push(Box::new(None::<String>));
        }
        Some(Some(v)) => {
            // value — set
            sets.push(format!("{} = ?{}", col, params.len() + 1));
            params.push(Box::new(v.clone()));
        }
    }
}

fn get_plan_internal(conn: &rusqlite::Connection, id: &str) -> Result<Plan, String> {
    conn.query_row(
        "SELECT id, title, description, category_id, parent_id, importance, urgency, ddl, tag_workflow_id, current_step_index, period_type, period_value, status, created_at, updated_at, completed_at FROM plans WHERE id = ?1",
        rusqlite::params![id],
        row_to_plan,
    )
    .map_err(|e| e.to_string())
}

fn row_to_plan(row: &rusqlite::Row) -> rusqlite::Result<Plan> {
    Ok(Plan {
        id: row.get(0)?,
        title: row.get(1)?,
        description: row.get(2)?,
        category_id: row.get(3)?,
        parent_id: row.get(4)?,
        importance: row.get(5)?,
        urgency: row.get(6)?,
        ddl: row.get(7)?,
        tag_workflow_id: row.get(8)?,
        current_step_index: row.get(9)?,
        period_type: row.get(10)?,
        period_value: row.get(11)?,
        status: row.get(12)?,
        created_at: row.get(13)?,
        updated_at: row.get(14)?,
        completed_at: row.get(15)?,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_apply_nullable_absent() {
        let mut sets = Vec::new();
        let mut params: Vec<Box<dyn ToSql>> = Vec::new();
        // outer None = key absent
        apply_nullable(&mut sets, &mut params, "ddl", &None);
        assert!(sets.is_empty());
    }

    #[test]
    fn test_apply_nullable_clear() {
        let mut sets = Vec::new();
        let mut params: Vec<Box<dyn ToSql>> = Vec::new();
        // Some(None) = explicit null → clear
        apply_nullable(&mut sets, &mut params, "ddl", &Some(None));
        assert_eq!(sets.len(), 1);
        assert!(sets[0].contains("ddl"));
    }

    #[test]
    fn test_apply_nullable_set() {
        let mut sets = Vec::new();
        let mut params: Vec<Box<dyn ToSql>> = Vec::new();
        // outer Some(Some(v)) = set value
        apply_nullable(
            &mut sets,
            &mut params,
            "ddl",
            &Some(Some("2026-12-31T00:00:00Z".to_string())),
        );
        assert_eq!(sets.len(), 1);
        assert!(sets[0].contains("ddl"));
    }

    fn make_db() -> Database {
        let db = Database {
            conn: std::sync::Mutex::new(rusqlite::Connection::open_in_memory().unwrap()),
        };
        db.conn
            .lock()
            .unwrap()
            .pragma_update(None, "foreign_keys", "ON")
            .unwrap();
        db.run_migrations().unwrap();
        db
    }

    fn create_request() -> CreatePlanRequest {
        CreatePlanRequest {
            title: "计划".to_string(),
            description: String::new(),
            category_id: None,
            parent_id: None,
            importance: 1.0,
            urgency: 1.0,
            ddl: None,
            tag_workflow_id: None,
            current_step_index: 0,
            period_type: None,
            period_value: None,
            status: "active".to_string(),
        }
    }

    #[test]
    fn completed_at_tracks_status_transitions_only() {
        let db = make_db();
        let plan = create_plan_inner(&db, create_request()).unwrap();
        let completed = update_plan_inner(
            &db,
            UpdatePlanRequest {
                id: plan.id.clone(),
                title: None,
                description: None,
                category_id: None,
                parent_id: None,
                importance: None,
                urgency: None,
                ddl: None,
                tag_workflow_id: None,
                current_step_index: None,
                period_type: None,
                period_value: None,
                status: Some("completed".to_string()),
            },
        )
        .unwrap();
        assert!(completed.completed_at.is_some());
        let titled = update_plan_inner(
            &db,
            UpdatePlanRequest {
                id: plan.id.clone(),
                title: Some("新标题".to_string()),
                description: None,
                category_id: None,
                parent_id: None,
                importance: None,
                urgency: None,
                ddl: None,
                tag_workflow_id: None,
                current_step_index: None,
                period_type: None,
                period_value: None,
                status: None,
            },
        )
        .unwrap();
        assert_eq!(titled.completed_at, completed.completed_at);
        let active = update_plan_inner(
            &db,
            UpdatePlanRequest {
                id: plan.id,
                title: None,
                description: None,
                category_id: None,
                parent_id: None,
                importance: None,
                urgency: None,
                ddl: None,
                tag_workflow_id: None,
                current_step_index: None,
                period_type: None,
                period_value: None,
                status: Some("active".to_string()),
            },
        )
        .unwrap();
        assert!(active.completed_at.is_none());
    }
}
