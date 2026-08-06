mod commands;
mod db;
mod models;
mod seed;

use db::Database;
use std::path::PathBuf;
use tauri::Manager;

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

            // Run seed data for development — log error but don't crash
            if let Err(e) = seed::run_seed(&database) {
                eprintln!("seed data warning (app will still start): {}", e);
            }

            app.manage(database);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // Plans
            commands::plans::create_plan,
            commands::plans::get_plan,
            commands::plans::update_plan,
            commands::plans::delete_plan,
            commands::plans::list_plans,
            // Categories
            commands::categories::create_category,
            commands::categories::list_categories,
            commands::categories::update_category,
            commands::categories::delete_category,
            // Tag workflows
            commands::workflows::create_tag_workflow,
            commands::workflows::list_tag_workflows,
            commands::workflows::update_tag_workflow,
            commands::workflows::delete_tag_workflow,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
