use crate::db::Database;
use crate::models::{CreateTagWorkflowRequest, TagWorkflow, UpdateTagWorkflowRequest};
use tauri::State;

/// Create a new tag workflow
#[tauri::command]
pub fn create_tag_workflow(
    db: State<'_, Database>,
    request: CreateTagWorkflowRequest,
) -> Result<TagWorkflow, String> {
    create_tag_workflow_inner(db.inner(), request)
}

pub(crate) fn create_tag_workflow_inner(
    db: &Database,
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
    update_tag_workflow_inner(db.inner(), request)
}

pub(crate) fn update_tag_workflow_inner(
    db: &Database,
    request: UpdateTagWorkflowRequest,
) -> Result<TagWorkflow, String> {
    let mut conn = db.conn.lock().map_err(|e| e.to_string())?;
    let tx = conn.transaction().map_err(|e| e.to_string())?;

    let mut sets: Vec<String> = Vec::new();
    let mut params: Vec<Box<dyn rusqlite::types::ToSql>> = Vec::new();

    if let Some(v) = request.name {
        sets.push(format!("name = ?{}", sets.len() + 1));
        params.push(Box::new(v));
    }
    if let Some(ref v) = request.steps {
        sets.push(format!("steps = ?{}", sets.len() + 1));
        params.push(Box::new(v.clone()));
    }

    if let Some(new_steps) = request.steps.as_ref() {
        let old_steps: String = tx
            .query_row(
                "SELECT steps FROM tag_workflows WHERE id = ?1",
                rusqlite::params![request.id],
                |row| row.get(0),
            )
            .map_err(|e| e.to_string())?;
        let old_steps: Vec<String> = serde_json::from_str(&old_steps).map_err(|e| e.to_string())?;
        let new_steps_vec: Vec<String> =
            serde_json::from_str(new_steps).map_err(|e| e.to_string())?;
        for (plan_id, old_index) in tx
            .prepare("SELECT id, current_step_index FROM plans WHERE tag_workflow_id = ?1")
            .map_err(|e| e.to_string())?
            .query_map(rusqlite::params![request.id], |row| {
                Ok((row.get::<_, String>(0)?, row.get::<_, i32>(1)?))
            })
            .map_err(|e| e.to_string())?
            .collect::<Result<Vec<_>, _>>()
            .map_err(|e| e.to_string())?
        {
            let new_index = old_steps
                .get(old_index as usize)
                .and_then(|name| new_steps_vec.iter().position(|step| step == name))
                .unwrap_or(0) as i32;
            tx.execute(
                "UPDATE plans SET current_step_index = ?1 WHERE id = ?2",
                rusqlite::params![new_index, plan_id],
            )
            .map_err(|e| e.to_string())?;
        }
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
        tx.execute(&sql, param_refs.as_slice())
            .map_err(|e| e.to_string())?;
    }

    let workflow = tx
        .query_row(
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
        .map_err(|e| e.to_string())?;
    tx.commit().map_err(|e| e.to_string())?;
    Ok(workflow)
}

/// Delete a tag workflow by id
#[tauri::command]
pub fn delete_tag_workflow(db: State<'_, Database>, id: String) -> Result<bool, String> {
    delete_tag_workflow_inner(db.inner(), id)
}

pub(crate) fn delete_tag_workflow_inner(db: &Database, id: String) -> Result<bool, String> {
    let mut conn = db.conn.lock().map_err(|e| e.to_string())?;
    let tx = conn.transaction().map_err(|e| e.to_string())?;
    let now = chrono::Utc::now().to_rfc3339();
    tx.execute(
        "UPDATE plans SET tag_workflow_id = NULL, current_step_index = 0, updated_at = ?1 WHERE tag_workflow_id = ?2",
        rusqlite::params![now, id],
    )
    .map_err(|e| e.to_string())?;
    let affected = tx
        .execute(
            "DELETE FROM tag_workflows WHERE id = ?1",
            rusqlite::params![id],
        )
        .map_err(|e| e.to_string())?;
    tx.commit().map_err(|e| e.to_string())?;
    Ok(affected > 0)
}

#[cfg(test)]
mod tests {
    use super::*;
    use rusqlite::Connection;
    use std::sync::Mutex;

    fn make_db() -> Database {
        let db = Database {
            conn: Mutex::new(Connection::open_in_memory().unwrap()),
        };
        db.conn
            .lock()
            .unwrap()
            .pragma_update(None, "foreign_keys", "ON")
            .unwrap();
        db.run_migrations().unwrap();
        db
    }

    fn create_request(steps: &str) -> CreateTagWorkflowRequest {
        CreateTagWorkflowRequest {
            name: "测试工作流".to_string(),
            steps: steps.to_string(),
        }
    }

    fn insert_bound_plan(db: &Database, workflow_id: &str, index: i32) {
        db.conn.lock().unwrap().execute(
            "INSERT INTO plans (id, title, tag_workflow_id, current_step_index, created_at, updated_at) VALUES ('plan-1', '计划', ?1, ?2, '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z')",
            rusqlite::params![workflow_id, index],
        ).unwrap();
    }

    #[test]
    fn delete_workflow_detaches_plans_and_is_idempotent() {
        let db = make_db();
        let workflow = create_tag_workflow_inner(&db, create_request(r#"["A","B","C"]"#)).unwrap();
        insert_bound_plan(&db, &workflow.id, 2);
        assert!(delete_tag_workflow_inner(&db, workflow.id.clone()).unwrap());
        let conn = db.conn.lock().unwrap();
        let (workflow_id, index): (Option<String>, i32) = conn
            .query_row(
                "SELECT tag_workflow_id, current_step_index FROM plans WHERE id = 'plan-1'",
                [],
                |row| Ok((row.get(0)?, row.get(1)?)),
            )
            .unwrap();
        assert!(workflow_id.is_none());
        assert_eq!(index, 0);
        drop(conn);
        assert!(!delete_tag_workflow_inner(&db, "missing".to_string()).unwrap());
    }

    #[test]
    fn update_workflow_remaps_steps_by_name_and_resets_missing() {
        let db = make_db();
        let workflow = create_tag_workflow_inner(&db, create_request(r#"["A","B","C"]"#)).unwrap();
        insert_bound_plan(&db, &workflow.id, 2);
        update_tag_workflow_inner(
            &db,
            UpdateTagWorkflowRequest {
                id: workflow.id.clone(),
                name: None,
                steps: Some(r#"["X","C","B"]"#.to_string()),
            },
        )
        .unwrap();
        let index: i32 = db
            .conn
            .lock()
            .unwrap()
            .query_row(
                "SELECT current_step_index FROM plans WHERE id = 'plan-1'",
                [],
                |row| row.get(0),
            )
            .unwrap();
        assert_eq!(index, 1);
        update_tag_workflow_inner(
            &db,
            UpdateTagWorkflowRequest {
                id: workflow.id,
                name: None,
                steps: Some(r#"["Z"]"#.to_string()),
            },
        )
        .unwrap();
        let index: i32 = db
            .conn
            .lock()
            .unwrap()
            .query_row(
                "SELECT current_step_index FROM plans WHERE id = 'plan-1'",
                [],
                |row| row.get(0),
            )
            .unwrap();
        assert_eq!(index, 0);
    }
}
