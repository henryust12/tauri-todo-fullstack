use serde::{Deserialize, Serialize};

use crate::error::AppError;

pub const MAX_TITLE_CHARS: usize = 200;

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Todo {
    pub id: String,
    pub title: String,
    pub completed: bool,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Deserialize)]
pub struct NewTodo {
    pub title: String,
}

#[derive(Debug, Clone, Default, Deserialize)]
pub struct TodoPatch {
    pub title: Option<String>,
    pub completed: Option<bool>,
}

/// Trims the title and checks it is 1 to 200 Unicode scalar values.
pub fn validate_title(raw: &str) -> Result<String, AppError> {
    let title = raw.trim();
    let len = title.chars().count();
    if len == 0 {
        return Err(AppError::Validation("Title must not be empty".into()));
    }
    if len > MAX_TITLE_CHARS {
        return Err(AppError::Validation(format!(
            "Title must be at most {MAX_TITLE_CHARS} characters"
        )));
    }
    Ok(title.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn rejects_empty_and_whitespace() {
        assert!(matches!(validate_title(""), Err(AppError::Validation(_))));
        assert!(matches!(
            validate_title(" \t\n\u{3000}"),
            Err(AppError::Validation(_))
        ));
    }

    #[test]
    fn enforces_200_char_limit() {
        assert_eq!(validate_title(&"a".repeat(200)).unwrap().len(), 200);
        assert!(matches!(
            validate_title(&"a".repeat(201)),
            Err(AppError::Validation(_))
        ));
    }

    #[test]
    fn counts_unicode_scalars_not_bytes() {
        let ok = "あ".repeat(200);
        assert!(ok.len() > 200);
        assert_eq!(validate_title(&ok).unwrap(), ok);
        assert!(validate_title(&"あ".repeat(201)).is_err());
    }

    #[test]
    fn trims_surrounding_whitespace() {
        assert_eq!(validate_title("  買い物 \n").unwrap(), "買い物");
        // Padding does not count toward the limit.
        let padded = format!("  {}  ", "a".repeat(200));
        assert!(validate_title(&padded).is_ok());
    }

    #[test]
    fn todo_serializes_camel_case() {
        let todo = Todo {
            id: "1".into(),
            title: "t".into(),
            completed: false,
            created_at: "c".into(),
            updated_at: "u".into(),
        };
        let v = serde_json::to_value(&todo).unwrap();
        assert!(v.get("createdAt").is_some() && v.get("updatedAt").is_some());
    }
}
