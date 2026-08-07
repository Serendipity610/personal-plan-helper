use crate::db::Database;
use crate::models::{Category, CreateCategoryRequest, UpdateCategoryRequest};
use rusqlite::OptionalExtension;
use tauri::State;

/// Create a new category
#[tauri::command]
pub fn create_category(
    db: State<'_, Database>,
    request: CreateCategoryRequest,
) -> Result<Category, String> {
    create_category_inner(db.inner(), request)
}

/// Inner implementation for testability (commands take `State`, which tests cannot construct).
pub(crate) fn create_category_inner(
    db: &Database,
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
        "SELECT id, name, color, icon, sort_order, is_default, created_at FROM categories WHERE id = ?1",
        rusqlite::params![id],
        |row| {
            Ok(Category {
                id: row.get(0)?,
                name: row.get(1)?,
                color: row.get(2)?,
                icon: row.get(3)?,
                sort_order: row.get(4)?,
                is_default: row.get(5)?,
                created_at: row.get(6)?,
            })
        },
    )
    .map_err(|e| e.to_string())
}

/// List all categories ordered by sort_order
#[tauri::command]
pub fn list_categories(db: State<'_, Database>) -> Result<Vec<Category>, String> {
    list_categories_inner(db.inner())
}

/// Inner implementation for testability (commands take `State`, which tests cannot construct).
pub(crate) fn list_categories_inner(db: &Database) -> Result<Vec<Category>, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare("SELECT id, name, color, icon, sort_order, is_default, created_at FROM categories ORDER BY sort_order ASC")
        .map_err(|e| e.to_string())?;

    let categories = stmt
        .query_map([], |row| {
            Ok(Category {
                id: row.get(0)?,
                name: row.get(1)?,
                color: row.get(2)?,
                icon: row.get(3)?,
                sort_order: row.get(4)?,
                is_default: row.get(5)?,
                created_at: row.get(6)?,
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
    update_category_inner(db.inner(), request)
}

/// Inner implementation for testability (commands take `State`, which tests cannot construct).
pub(crate) fn update_category_inner(
    db: &Database,
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
        "SELECT id, name, color, icon, sort_order, is_default, created_at FROM categories WHERE id = ?1",
        rusqlite::params![request.id],
        |row| {
            Ok(Category {
                id: row.get(0)?,
                name: row.get(1)?,
                color: row.get(2)?,
                icon: row.get(3)?,
                sort_order: row.get(4)?,
                is_default: row.get(5)?,
                created_at: row.get(6)?,
            })
        },
    )
    .map_err(|e| e.to_string())
}

/// Delete a category by id
#[tauri::command]
pub fn delete_category(db: State<'_, Database>, id: String) -> Result<bool, String> {
    delete_category_inner(db.inner(), id)
}

/// Inner implementation for testability (commands take `State`, which tests cannot construct).
pub(crate) fn delete_category_inner(db: &Database, id: String) -> Result<bool, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let is_default: Option<bool> = conn
        .query_row(
            "SELECT is_default FROM categories WHERE id = ?1",
            rusqlite::params![id],
            |row| row.get(0),
        )
        .optional()
        .map_err(|e| e.to_string())?;

    if is_default == Some(true) {
        return Err("默认分类不可删除".to_string());
    }

    let affected = conn
        .execute(
            "DELETE FROM categories WHERE id = ?1",
            rusqlite::params![id],
        )
        .map_err(|e| e.to_string())?;
    Ok(affected > 0)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::seed;
    use rusqlite::Connection;
    use std::sync::Mutex;

    /// Stable ID of the seeded "工作计划" default category (see seed.rs).
    const DEFAULT_CAT_ID: &str = "a1b2c3d4-0001-4000-8000-000000000001";

    fn make_db() -> Database {
        let conn = Connection::open_in_memory().unwrap();
        conn.pragma_update(None, "journal_mode", "WAL").unwrap();
        conn.pragma_update(None, "foreign_keys", "ON").unwrap();

        let db = Database {
            conn: Mutex::new(conn),
        };
        db.run_migrations().unwrap();
        seed::run_seed(&db).unwrap();
        db
    }

    fn create_request(name: &str) -> CreateCategoryRequest {
        CreateCategoryRequest {
            name: name.to_string(),
            color: "#123456".to_string(),
            icon: String::new(),
            sort_order: 0,
        }
    }

    #[test]
    fn test_create_category_is_not_default() {
        let db = make_db();
        let created = create_category_inner(&db, create_request("自定义分类")).unwrap();
        assert!(!created.is_default, "user-created categories must never be default");
    }

    #[test]
    fn test_delete_default_category_rejected() {
        let db = make_db();
        let err = delete_category_inner(&db, DEFAULT_CAT_ID.to_string()).unwrap_err();
        assert!(err.contains("默认分类不可删除"), "unexpected error: {err}");
    }

    #[test]
    fn test_delete_custom_category_ok() {
        let db = make_db();
        let created = create_category_inner(&db, create_request("可删除分类")).unwrap();
        assert!(delete_category_inner(&db, created.id).unwrap());
    }

    #[test]
    fn test_update_default_category_keeps_default_flag() {
        let db = make_db();
        let updated = update_category_inner(
            &db,
            UpdateCategoryRequest {
                id: DEFAULT_CAT_ID.to_string(),
                name: Some("工作计划改".to_string()),
                color: None,
                icon: None,
                sort_order: None,
            },
        )
        .unwrap();
        assert!(updated.is_default, "editing a default category must keep the flag");
        assert_eq!(updated.name, "工作计划改");
    }

    #[test]
    fn test_list_categories_reports_default_flag() {
        let db = make_db();
        let list = list_categories_inner(&db).unwrap();
        assert_eq!(list.len(), 4);
        assert!(list.iter().all(|c| c.is_default));

        let created = create_category_inner(&db, create_request("自定义")).unwrap();
        let list = list_categories_inner(&db).unwrap();
        assert_eq!(list.len(), 5);
        let custom = list.iter().find(|c| c.id == created.id).unwrap();
        assert!(!custom.is_default);
    }
}
