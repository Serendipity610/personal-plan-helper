use crate::db::Database;
use crate::models::{CreatePlanRequest, Plan, UpdatePlanRequest};
use tauri::State;

/// Create a new plan
#[tauri::command]
pub fn create_plan(db: State<'_, Database>, request: CreatePlanRequest) -> Result<Plan, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let id = uuid::Uuid::new_v4().to_string();
    let now = chrono::Utc::now().to_rfc3339();

    conn.execute(
        "INSERT INTO plans (id, title, description, category_id, parent_id, importance, urgency, ddl, tag_workflow_id, current_step_index, period_type, period_value, status, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?14)",
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

/// Update an existing plan
#[tauri::command]
pub fn update_plan(db: State<'_, Database>, request: UpdatePlanRequest) -> Result<Plan, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let now = chrono::Utc::now().to_rfc3339();

    // Build dynamic UPDATE statement based on provided fields
    let mut sets: Vec<String> = Vec::new();
    let mut params: Vec<Box<dyn rusqlite::types::ToSql>> = Vec::new();

    if let Some(title) = request.title {
        sets.push(format!("title = ?{}", sets.len() + 1));
        params.push(Box::new(title));
    }
    if let Some(description) = request.description {
        sets.push(format!("description = ?{}", sets.len() + 1));
        params.push(Box::new(description));
    }
    if let Some(category_id) = request.category_id {
        sets.push(format!("category_id = ?{}", sets.len() + 1));
        params.push(Box::new(category_id));
    }
    if let Some(parent_id) = request.parent_id {
        sets.push(format!("parent_id = ?{}", sets.len() + 1));
        params.push(Box::new(parent_id));
    }
    if let Some(importance) = request.importance {
        sets.push(format!("importance = ?{}", sets.len() + 1));
        params.push(Box::new(importance));
    }
    if let Some(urgency) = request.urgency {
        sets.push(format!("urgency = ?{}", sets.len() + 1));
        params.push(Box::new(urgency));
    }
    if let Some(ddl) = request.ddl {
        sets.push(format!("ddl = ?{}", sets.len() + 1));
        params.push(Box::new(ddl));
    }
    if let Some(tag_workflow_id) = request.tag_workflow_id {
        sets.push(format!("tag_workflow_id = ?{}", sets.len() + 1));
        params.push(Box::new(tag_workflow_id));
    }
    if let Some(current_step_index) = request.current_step_index {
        sets.push(format!("current_step_index = ?{}", sets.len() + 1));
        params.push(Box::new(current_step_index));
    }
    if let Some(period_type) = request.period_type {
        sets.push(format!("period_type = ?{}", sets.len() + 1));
        params.push(Box::new(period_type));
    }
    if let Some(period_value) = request.period_value {
        sets.push(format!("period_value = ?{}", sets.len() + 1));
        params.push(Box::new(period_value));
    }
    if let Some(status) = request.status {
        sets.push(format!("status = ?{}", sets.len() + 1));
        params.push(Box::new(status));
    }

    if sets.is_empty() {
        return get_plan_internal(&conn, &request.id);
    }

    // Always update updated_at
    sets.push(format!("updated_at = ?{}", sets.len() + 1));
    params.push(Box::new(now));

    // Add id as the last param
    let id_idx = sets.len() + 1;
    params.push(Box::new(request.id.clone()));

    let sql = format!(
        "UPDATE plans SET {} WHERE id = ?{}",
        sets.join(", "),
        id_idx
    );

    let param_refs: Vec<&dyn rusqlite::types::ToSql> = params.iter().map(|p| p.as_ref()).collect();
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

/// List all plans, optionally filtered by status
#[tauri::command]
pub fn list_plans(db: State<'_, Database>, status: Option<String>) -> Result<Vec<Plan>, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;

    let (sql, params): (String, Vec<String>) = if let Some(s) = status {
        (
            "SELECT id, title, description, category_id, parent_id, importance, urgency, ddl, tag_workflow_id, current_step_index, period_type, period_value, status, created_at, updated_at FROM plans WHERE status = ?1 ORDER BY created_at DESC".to_string(),
            vec![s],
        )
    } else {
        (
            "SELECT id, title, description, category_id, parent_id, importance, urgency, ddl, tag_workflow_id, current_step_index, period_type, period_value, status, created_at, updated_at FROM plans ORDER BY created_at DESC".to_string(),
            vec![],
        )
    };

    let param_refs: Vec<&dyn rusqlite::types::ToSql> = params.iter().map(|s| s as &dyn rusqlite::types::ToSql).collect();
    let mut stmt = conn.prepare(&sql).map_err(|e| e.to_string())?;

    let plans = stmt
        .query_map(param_refs.as_slice(), row_to_plan)
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    Ok(plans)
}

// --- Internal helpers ---

fn get_plan_internal(conn: &rusqlite::Connection, id: &str) -> Result<Plan, String> {
    conn.query_row(
        "SELECT id, title, description, category_id, parent_id, importance, urgency, ddl, tag_workflow_id, current_step_index, period_type, period_value, status, created_at, updated_at FROM plans WHERE id = ?1",
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
    })
}
