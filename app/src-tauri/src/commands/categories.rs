use crate::db::Database;
use crate::models::{Category, CreateCategoryRequest, UpdateCategoryRequest};
use tauri::State;

/// Create a new category
#[tauri::command]
pub fn create_category(
    db: State<'_, Database>,
    request: CreateCategoryRequest,
) -> Result<Category, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let id = uuid::Uuid::new_v4().to_string();
    let now = chrono::Utc::now().to_rfc3339();

    conn.execute(
        "INSERT INTO categories (id, name, color, icon, sort_order, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        rusqlite::params![id, request.name, request.color, request.icon, request.sort_order, now],
    )
    .map_err(|e| e.to_string())?;

    conn.query_row(
        "SELECT id, name, color, icon, sort_order, created_at FROM categories WHERE id = ?1",
        rusqlite::params![id],
        |row| {
            Ok(Category {
                id: row.get(0)?,
                name: row.get(1)?,
                color: row.get(2)?,
                icon: row.get(3)?,
                sort_order: row.get(4)?,
                created_at: row.get(5)?,
            })
        },
    )
    .map_err(|e| e.to_string())
}

/// List all categories ordered by sort_order
#[tauri::command]
pub fn list_categories(db: State<'_, Database>) -> Result<Vec<Category>, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare("SELECT id, name, color, icon, sort_order, created_at FROM categories ORDER BY sort_order ASC")
        .map_err(|e| e.to_string())?;

    let categories = stmt
        .query_map([], |row| {
            Ok(Category {
                id: row.get(0)?,
                name: row.get(1)?,
                color: row.get(2)?,
                icon: row.get(3)?,
                sort_order: row.get(4)?,
                created_at: row.get(5)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    Ok(categories)
}

/// Update a category
#[tauri::command]
pub fn update_category(
    db: State<'_, Database>,
    request: UpdateCategoryRequest,
) -> Result<Category, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;

    let mut sets: Vec<String> = Vec::new();
    let mut params: Vec<Box<dyn rusqlite::types::ToSql>> = Vec::new();

    if let Some(v) = request.name {
        sets.push(format!("name = ?{}", sets.len() + 1));
        params.push(Box::new(v));
    }
    if let Some(v) = request.color {
        sets.push(format!("color = ?{}", sets.len() + 1));
        params.push(Box::new(v));
    }
    if let Some(v) = request.icon {
        sets.push(format!("icon = ?{}", sets.len() + 1));
        params.push(Box::new(v));
    }
    if let Some(v) = request.sort_order {
        sets.push(format!("sort_order = ?{}", sets.len() + 1));
        params.push(Box::new(v));
    }

    if !sets.is_empty() {
        let id_idx = sets.len() + 1;
        params.push(Box::new(request.id.clone()));
        let sql = format!(
            "UPDATE categories SET {} WHERE id = ?{}",
            sets.join(", "),
            id_idx
        );
        let param_refs: Vec<&dyn rusqlite::types::ToSql> =
            params.iter().map(|p| p.as_ref()).collect();
        conn.execute(&sql, param_refs.as_slice())
            .map_err(|e| e.to_string())?;
    }

    conn.query_row(
        "SELECT id, name, color, icon, sort_order, created_at FROM categories WHERE id = ?1",
        rusqlite::params![request.id],
        |row| {
            Ok(Category {
                id: row.get(0)?,
                name: row.get(1)?,
                color: row.get(2)?,
                icon: row.get(3)?,
                sort_order: row.get(4)?,
                created_at: row.get(5)?,
            })
        },
    )
    .map_err(|e| e.to_string())
}

/// Delete a category by id
#[tauri::command]
pub fn delete_category(db: State<'_, Database>, id: String) -> Result<bool, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let affected = conn
        .execute(
            "DELETE FROM categories WHERE id = ?1",
            rusqlite::params![id],
        )
        .map_err(|e| e.to_string())?;
    Ok(affected > 0)
}
