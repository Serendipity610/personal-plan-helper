use crate::db::Database;
use crate::models::{CreateTagWorkflowRequest, TagWorkflow};
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
