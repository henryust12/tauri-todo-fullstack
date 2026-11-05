use serde::{Serialize, Serializer, ser::SerializeStruct};

/// Errors returned to the frontend as `{ kind, message }`.
#[derive(Debug, thiserror::Error)]
pub enum AppError {
    #[error("{0}")]
    Validation(String),
    #[error("{0}")]
    NotFound(String),
    #[error("{0}")]
    Storage(String),
}

impl AppError {
    fn kind(&self) -> &'static str {
        match self {
            AppError::Validation(_) => "validation",
            AppError::NotFound(_) => "notFound",
            AppError::Storage(_) => "storage",
        }
    }
}

impl Serialize for AppError {
    fn serialize<S: Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        let mut state = serializer.serialize_struct("AppError", 2)?;
        state.serialize_field("kind", self.kind())?;
        state.serialize_field("message", &self.to_string())?;
        state.end()
    }
}

impl From<rusqlite::Error> for AppError {
    fn from(err: rusqlite::Error) -> Self {
        AppError::Storage(err.to_string())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn serializes_to_contract_shape() {
        let cases = [
            (AppError::Validation("bad".into()), "validation"),
            (AppError::NotFound("gone".into()), "notFound"),
            (AppError::Storage("disk".into()), "storage"),
        ];
        for (err, kind) in cases {
            let message = err.to_string();
            assert_eq!(
                serde_json::to_value(&err).unwrap(),
                json!({ "kind": kind, "message": message })
            );
        }
    }

    #[test]
    fn rusqlite_error_maps_to_storage() {
        let err: AppError = rusqlite::Error::QueryReturnedNoRows.into();
        assert!(matches!(err, AppError::Storage(_)));
    }
}
