mod commands;
mod db;
mod models;
mod seed;

use db::Database;
use std::path::PathBuf;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            // Resolve app data directory for the SQLite database
            let app_data_dir: PathBuf = app
                .path()
                .app_data_dir()
                .expect("failed to resolve app data directory");

            let database = Database::open(app_data_dir).expect("failed to initialize database");

            // Run seed data for development
            seed::run_seed(&database);

            app.manage(database);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::plans::create_plan,
            commands::plans::get_plan,
            commands::plans::update_plan,
            commands::plans::delete_plan,
            commands::plans::list_plans,
            commands::categories::create_category,
            commands::categories::list_categories,
            commands::workflows::create_tag_workflow,
            commands::workflows::list_tag_workflows,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
