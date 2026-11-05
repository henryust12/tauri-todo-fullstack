mod commands;
mod error;
mod repository;
mod todo;

use std::sync::Mutex;

use tauri::Manager;

use commands::AppState;
use repository::SqliteTodoRepository;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            let dir = app.path().app_data_dir()?;
            std::fs::create_dir_all(&dir)?;
            let repo = SqliteTodoRepository::open(dir.join("todos.sqlite3"))?;
            app.manage(AppState {
                repo: Mutex::new(repo),
            });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::list_todos,
            commands::create_todo,
            commands::update_todo,
            commands::delete_todo,
            commands::clear_completed,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
