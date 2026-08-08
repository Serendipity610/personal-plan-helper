use crate::db::Database;
use crate::models::{CreateTagWorkflowRequest, TagWorkflow, UpdateTagWorkflowRequest};
use tauri::State;

/// Create a new tag workflow
#[tauri::command]
pub fn create_tag_workflow(
    db: State<'_, Database>,
    request: CreateTagWorkflowRequest,
) -> Result<TagWorkflow, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let id = uuid::Uuid::new_v4().to_string();
    let now = chrono::Utc::now().to_rfc3339();

    conn.execute(
        "INSERT INTO tag_workflows (id, name, steps, created_at) VALUES (?1, ?2, ?3, ?4)",
        rusqlite::params![id, request.name, request.steps, now],
    )
    .map_err(|e| e.to_string())?;

    conn.query_row(
        "SELECT id, name, steps, created_at FROM tag_workflows WHERE id = ?1",
        rusqlite::params![id],
        |row| {
            Ok(TagWorkflow {
                id: row.get(0)?,
                name: row.get(1)?,
                steps: row.get(2)?,
                created_at: row.get(3)?,
            })
        },
    )
    .map_err(|e| e.to_string())
}

/// List all tag workflows
#[tauri::command]
pub fn list_tag_workflows(db: State<'_, Database>) -> Result<Vec<TagWorkflow>, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare("SELECT id, name, steps, created_at FROM tag_workflows ORDER BY created_at DESC")
        .map_err(|e| e.to_string())?;

    let workflows = stmt
        .query_map([], |row| {
            Ok(TagWorkflow {
                id: row.get(0)?,
                name: row.get(1)?,
                steps: row.get(2)?,
                created_at: row.get(3)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    Ok(workflows)
}

/// Update a tag workflow
#[tauri::command]
pub fn update_tag_workflow(
    db: State<'_, Database>,
    request: UpdateTagWorkflowRequest,
) -> Result<TagWorkflow, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;

    let mut sets: Vec<String> = Vec::new();
    let mut params: Vec<Box<dyn rusqlite::types::ToSql>> = Vec::new();

    if let Some(v) = request.name {
        sets.push(format!("name = ?{}", sets.len() + 1));
        params.push(Box::new(v));
    }
    if let Some(v) = request.steps {
        sets.push(format!("steps = ?{}", sets.len() + 1));
        params.push(Box::new(v));
    }

    if !sets.is_empty() {
        let id_idx = sets.len() + 1;
        params.push(Box::new(request.id.clone()));
        let sql = format!(
            "UPDATE tag_workflows SET {} WHERE id = ?{}",
            sets.join(", "),
            id_idx
        );
        let param_refs: Vec<&dyn rusqlite::types::ToSql> =
            params.iter().map(|p| p.as_ref()).collect();
        conn.execute(&sql, param_refs.as_slice())
            .map_err(|e| e.to_string())?;
    }

    conn.query_row(
        "SELECT id, name, steps, created_at FROM tag_workflows WHERE id = ?1",
        rusqlite::params![request.id],
        |row| {
            Ok(TagWorkflow {
                id: row.get(0)?,
                name: row.get(1)?,
                steps: row.get(2)?,
                created_at: row.get(3)?,
            })
        },
    )
    .map_err(|e| e.to_string())
}

/// Delete a tag workflow by id
#[tauri::command]
pub fn delete_tag_workflow(db: State<'_, Database>, id: String) -> Result<bool, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let affected = conn
        .execute(
            "DELETE FROM tag_workflows WHERE id = ?1",
            rusqlite::params![id],
        )
        .map_err(|e| e.to_string())?;
    Ok(affected > 0)
}
