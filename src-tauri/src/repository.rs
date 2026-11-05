use std::path::Path;

use chrono::{SecondsFormat, Utc};
use rusqlite::{Connection, OptionalExtension, Row, params};
use uuid::Uuid;

use crate::error::AppError;
use crate::todo::{NewTodo, Todo, TodoPatch, validate_title};

pub trait TodoRepository {
    fn list(&self) -> Result<Vec<Todo>, AppError>;
    fn create(&self, new: NewTodo) -> Result<Todo, AppError>;
    fn update(&self, id: &str, patch: TodoPatch) -> Result<Todo, AppError>;
    fn delete(&self, id: &str) -> Result<(), AppError>;
    fn clear_completed(&self) -> Result<usize, AppError>;
}

pub struct SqliteTodoRepository {
    conn: Connection,
}

const SCHEMA_VERSION: i64 = 1;
const COLUMNS: &str = "id, title, completed, created_at, updated_at";

fn now() -> String {
    Utc::now().to_rfc3339_opts(SecondsFormat::Millis, true)
}

fn not_found(id: &str) -> AppError {
    AppError::NotFound(format!("Todo {id} not found"))
}

fn row_to_todo(row: &Row<'_>) -> rusqlite::Result<Todo> {
    Ok(Todo {
        id: row.get(0)?,
        title: row.get(1)?,
        completed: row.get(2)?,
        created_at: row.get(3)?,
        updated_at: row.get(4)?,
    })
}

impl SqliteTodoRepository {
    pub fn open(path: impl AsRef<Path>) -> Result<Self, AppError> {
        let conn = Connection::open(path)?;
        // Returns the resulting mode as a row, so read it instead of execute.
        conn.query_row("PRAGMA journal_mode = WAL", [], |_| Ok(()))?;
        Self::from_connection(conn)
    }

    // Only the tests use the in-memory database; the app opens a file.
    #[cfg_attr(not(test), allow(dead_code))]
    pub fn open_in_memory() -> Result<Self, AppError> {
        Self::from_connection(Connection::open_in_memory()?)
    }

    fn from_connection(mut conn: Connection) -> Result<Self, AppError> {
        migrate(&mut conn)?;
        Ok(Self { conn })
    }

    fn get(&self, id: &str) -> Result<Todo, AppError> {
        self.conn
            .query_row(
                &format!("SELECT {COLUMNS} FROM todos WHERE id = ?1"),
                [id],
                row_to_todo,
            )
            .optional()?
            .ok_or_else(|| not_found(id))
    }
}

fn migrate(conn: &mut Connection) -> Result<(), AppError> {
    let version: i64 = conn.query_row("PRAGMA user_version", [], |r| r.get(0))?;
    if version < 1 {
        let tx = conn.transaction()?;
        tx.execute_batch(
            "CREATE TABLE todos (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                completed INTEGER NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );
            CREATE INDEX idx_todos_created_at ON todos (created_at);",
        )?;
        tx.pragma_update(None, "user_version", SCHEMA_VERSION)?;
        tx.commit()?;
    }
    Ok(())
}

impl TodoRepository for SqliteTodoRepository {
    fn list(&self) -> Result<Vec<Todo>, AppError> {
        let mut stmt = self.conn.prepare(&format!(
            "SELECT {COLUMNS} FROM todos ORDER BY created_at, id"
        ))?;
        let todos = stmt
            .query_map([], row_to_todo)?
            .collect::<rusqlite::Result<Vec<_>>>()?;
        Ok(todos)
    }

    fn create(&self, new: NewTodo) -> Result<Todo, AppError> {
        let title = validate_title(&new.title)?;
        let ts = now();
        let todo = Todo {
            id: Uuid::new_v4().to_string(),
            title,
            completed: false,
            created_at: ts.clone(),
            updated_at: ts,
        };
        self.conn.execute(
            "INSERT INTO todos (id, title, completed, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5)",
            params![
                todo.id,
                todo.title,
                todo.completed,
                todo.created_at,
                todo.updated_at
            ],
        )?;
        Ok(todo)
    }

    fn update(&self, id: &str, patch: TodoPatch) -> Result<Todo, AppError> {
        let title = patch.title.as_deref().map(validate_title).transpose()?;
        let current = self.get(id)?;
        if title.is_none() && patch.completed.is_none() {
            return Ok(current);
        }
        let title = title.unwrap_or(current.title);
        let completed = patch.completed.unwrap_or(current.completed);
        let ts = now();
        self.conn.execute(
            "UPDATE todos SET title = ?1, completed = ?2, updated_at = ?3 WHERE id = ?4",
            params![title, completed, ts, id],
        )?;
        self.get(id)
    }

    fn delete(&self, id: &str) -> Result<(), AppError> {
        let removed = self.conn.execute("DELETE FROM todos WHERE id = ?1", [id])?;
        if removed == 0 {
            return Err(not_found(id));
        }
        Ok(())
    }

    fn clear_completed(&self) -> Result<usize, AppError> {
        Ok(self
            .conn
            .execute("DELETE FROM todos WHERE completed = 1", [])?)
    }
}

#[cfg(test)]
mod tests {
    use std::thread::sleep;
    use std::time::Duration;

    use super::*;

    fn repo() -> SqliteTodoRepository {
        SqliteTodoRepository::open_in_memory().unwrap()
    }

    fn add(r: &SqliteTodoRepository, title: &str) -> Todo {
        // Timestamps have millisecond precision; keep creation order stable.
        sleep(Duration::from_millis(3));
        r.create(NewTodo {
            title: title.into(),
        })
        .unwrap()
    }

    #[test]
    fn create_and_list_in_order() {
        let r = repo();
        assert!(r.list().unwrap().is_empty());
        let a = add(&r, "  first ");
        let b = add(&r, "second");
        assert_eq!(a.title, "first");
        assert!(!a.completed);
        assert_eq!(a.created_at, a.updated_at);
        assert!(a.created_at.ends_with('Z'));
        assert_eq!(r.list().unwrap(), vec![a, b]);
    }

    #[test]
    fn create_rejects_invalid_title() {
        let r = repo();
        let err = r.create(NewTodo { title: "  ".into() }).unwrap_err();
        assert!(matches!(err, AppError::Validation(_)));
        assert!(r.list().unwrap().is_empty());
    }

    #[test]
    fn update_title() {
        let r = repo();
        let a = add(&r, "old");
        sleep(Duration::from_millis(3));
        let u = r
            .update(
                &a.id,
                TodoPatch {
                    title: Some(" new ".into()),
                    completed: None,
                },
            )
            .unwrap();
        assert_eq!(u.title, "new");
        assert!(!u.completed);
        assert_eq!(u.created_at, a.created_at);
        assert!(u.updated_at > a.updated_at);
    }

    #[test]
    fn update_invalid_title_is_validation_error() {
        let r = repo();
        let a = add(&r, "x");
        let err = r
            .update(
                &a.id,
                TodoPatch {
                    title: Some("".into()),
                    completed: None,
                },
            )
            .unwrap_err();
        assert!(matches!(err, AppError::Validation(_)));
    }

    #[test]
    fn toggle_completed_bumps_updated_at() {
        let r = repo();
        let a = add(&r, "x");
        sleep(Duration::from_millis(3));
        let u = r
            .update(
                &a.id,
                TodoPatch {
                    title: None,
                    completed: Some(true),
                },
            )
            .unwrap();
        assert!(u.completed);
        assert_eq!(u.title, "x");
        assert!(u.updated_at > a.updated_at);
    }

    #[test]
    fn empty_patch_returns_unchanged() {
        let r = repo();
        let a = add(&r, "x");
        sleep(Duration::from_millis(3));
        let u = r.update(&a.id, TodoPatch::default()).unwrap();
        assert_eq!(u, a);
        assert_eq!(r.list().unwrap(), vec![a]);
    }

    #[test]
    fn unknown_id_is_not_found() {
        let r = repo();
        assert!(matches!(
            r.update("nope", TodoPatch::default()),
            Err(AppError::NotFound(_))
        ));
        assert!(matches!(
            r.update(
                "nope",
                TodoPatch {
                    title: Some("t".into()),
                    completed: None
                }
            ),
            Err(AppError::NotFound(_))
        ));
        assert!(matches!(r.delete("nope"), Err(AppError::NotFound(_))));
    }

    #[test]
    fn delete_removes_row() {
        let r = repo();
        let a = add(&r, "a");
        let b = add(&r, "b");
        r.delete(&a.id).unwrap();
        assert_eq!(r.list().unwrap(), vec![b]);
    }

    #[test]
    fn clear_completed_returns_count() {
        let r = repo();
        let a = add(&r, "a");
        let b = add(&r, "b");
        let c = add(&r, "c");
        for id in [&a.id, &c.id] {
            r.update(
                id,
                TodoPatch {
                    title: None,
                    completed: Some(true),
                },
            )
            .unwrap();
        }
        assert_eq!(r.clear_completed().unwrap(), 2);
        assert_eq!(r.list().unwrap(), vec![b]);
        assert_eq!(r.clear_completed().unwrap(), 0);
    }

    #[test]
    fn migration_is_idempotent_and_data_survives_reopen() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("todos.sqlite3");
        let created = {
            let r = SqliteTodoRepository::open(&path).unwrap();
            add(&r, "persisted")
        };
        let r = SqliteTodoRepository::open(&path).unwrap();
        assert_eq!(r.list().unwrap(), vec![created]);
        let version: i64 = r
            .conn
            .query_row("PRAGMA user_version", [], |row| row.get(0))
            .unwrap();
        assert_eq!(version, SCHEMA_VERSION);
    }
}
