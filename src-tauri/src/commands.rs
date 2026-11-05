use std::sync::Mutex;

use tauri::State;

use crate::error::AppError;
use crate::repository::{SqliteTodoRepository, TodoRepository};
use crate::todo::{NewTodo, Todo, TodoPatch};

pub struct AppState {
    pub repo: Mutex<SqliteTodoRepository>,
}

impl AppState {
    fn with_repo<T>(
        &self,
        f: impl FnOnce(&SqliteTodoRepository) -> Result<T, AppError>,
    ) -> Result<T, AppError> {
        let repo = self
            .repo
            .lock()
            .map_err(|_| AppError::Storage("Database lock poisoned".into()))?;
        f(&repo)
    }
}

#[tauri::command]
pub fn list_todos(state: State<'_, AppState>) -> Result<Vec<Todo>, AppError> {
    state.with_repo(|r| r.list())
}

#[tauri::command]
pub fn create_todo(state: State<'_, AppState>, title: String) -> Result<Todo, AppError> {
    state.with_repo(|r| r.create(NewTodo { title }))
}

#[tauri::command]
pub fn update_todo(
    state: State<'_, AppState>,
    id: String,
    title: Option<String>,
    completed: Option<bool>,
) -> Result<Todo, AppError> {
    state.with_repo(|r| r.update(&id, TodoPatch { title, completed }))
}

#[tauri::command]
pub fn delete_todo(state: State<'_, AppState>, id: String) -> Result<(), AppError> {
    state.with_repo(|r| r.delete(&id))
}

#[tauri::command]
pub fn clear_completed(state: State<'_, AppState>) -> Result<usize, AppError> {
    state.with_repo(|r| r.clear_completed())
}
