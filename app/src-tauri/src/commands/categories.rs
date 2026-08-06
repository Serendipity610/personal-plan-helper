use crate::db::Database;
use crate::models::{Category, CreateCategoryRequest};
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
