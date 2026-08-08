use serde::de;
use serde::{Deserialize, Serialize};

/// 计划分类
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Category {
    pub id: String,
    pub name: String,
    pub color: String,
    pub icon: String,
    pub sort_order: i32,
    /// 预置分类（工作计划等）：不可删除但可编辑
    pub is_default: bool,
    pub created_at: String,
}

/// 标签工作流模板
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TagWorkflow {
    pub id: String,
    pub name: String,
    pub steps: String, // JSON array string
    pub created_at: String,
}

/// 核心计划/任务
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Plan {
    pub id: String,
    pub title: String,
    pub description: String,
    pub category_id: Option<String>,
    pub parent_id: Option<String>,
    pub importance: f64,
    pub urgency: f64,
    pub ddl: Option<String>,
    pub tag_workflow_id: Option<String>,
    pub current_step_index: i32,
    pub period_type: Option<String>,
    pub period_value: Option<String>,
    pub status: String,
    pub created_at: String,
    pub updated_at: String,
}

/// 操作日志
#[derive(Debug, Clone, Serialize, Deserialize)]
#[allow(dead_code)]
pub struct PlanLog {
    pub id: String,
    pub plan_id: String,
    pub action: String,
    pub detail: String,
    pub created_at: String,
}

// --- Request DTOs ---

#[derive(Debug, Deserialize)]
pub struct CreatePlanRequest {
    pub title: String,
    #[serde(default)]
    pub description: String,
    pub category_id: Option<String>,
    pub parent_id: Option<String>,
    #[serde(default)]
    pub importance: f64,
    #[serde(default)]
    pub urgency: f64,
    pub ddl: Option<String>,
    pub tag_workflow_id: Option<String>,
    #[serde(default)]
    pub current_step_index: i32,
    pub period_type: Option<String>,
    pub period_value: Option<String>,
    #[serde(default = "default_status")]
    pub status: String,
}

fn default_status() -> String {
    "active".to_string()
}

/// UpdatePlanRequest with custom deserialization so that nullable fields
/// correctly distinguish three states:
///   - key absent  → `None`       (no update)
///   - key = null  → `Some(None)` (clear to NULL)
///   - key = value → `Some(Some(v))` (set to value)
#[derive(Debug)]
pub struct UpdatePlanRequest {
    pub id: String,
    pub title: Option<String>,
    pub description: Option<String>,
    pub category_id: Option<Option<String>>,
    pub parent_id: Option<Option<String>>,
    pub importance: Option<f64>,
    pub urgency: Option<f64>,
    pub ddl: Option<Option<String>>,
    pub tag_workflow_id: Option<Option<String>>,
    pub current_step_index: Option<i32>,
    pub period_type: Option<Option<String>>,
    pub period_value: Option<Option<String>>,
    pub status: Option<String>,
}

impl<'de> Deserialize<'de> for UpdatePlanRequest {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: de::Deserializer<'de>,
    {
        // Deserialize the whole incoming JSON into a map so we can check
        // whether each key is absent, explicit-null, or has a value.
        // serde_json::Value deserializes any valid JSON; we constrain it to
        // an object below.
        let raw = serde_json::Value::deserialize(deserializer)?;
        let obj = raw.as_object().ok_or_else(|| {
            de::Error::invalid_type(serde::de::Unexpected::Other("non-object"), &"a JSON object")
        })?;

        let id = obj
            .get("id")
            .and_then(|v| v.as_str())
            .map(String::from)
            .ok_or_else(|| de::Error::missing_field("id"))?;

        /// Helper: None = key absent, Some(None) = explicit null, Some(Some(v)) = set.
        fn parse_nullable<V: serde::de::DeserializeOwned>(
            obj: &serde_json::Map<String, serde_json::Value>,
            key: &str,
        ) -> Result<Option<Option<V>>, serde_json::Error> {
            match obj.get(key) {
                None => Ok(None),
                Some(serde_json::Value::Null) => Ok(Some(None)),
                Some(v) => serde_json::from_value(v.clone()).map(|x| Some(Some(x))),
            }
        }

        /// Helper: None = key absent, Some(v) = set (null → null, value → value).
        fn parse_optional<V: serde::de::DeserializeOwned>(
            obj: &serde_json::Map<String, serde_json::Value>,
            key: &str,
        ) -> Result<Option<V>, serde_json::Error> {
            match obj.get(key) {
                None | Some(serde_json::Value::Null) => Ok(None),
                Some(v) => serde_json::from_value(v.clone()).map(Some),
            }
        }

        Ok(UpdatePlanRequest {
            id,
            title: parse_optional(obj, "title").map_err(de::Error::custom)?,
            description: parse_optional(obj, "description").map_err(de::Error::custom)?,
            category_id: parse_nullable(obj, "category_id").map_err(de::Error::custom)?,
            parent_id: parse_nullable(obj, "parent_id").map_err(de::Error::custom)?,
            importance: parse_optional(obj, "importance").map_err(de::Error::custom)?,
            urgency: parse_optional(obj, "urgency").map_err(de::Error::custom)?,
            ddl: parse_nullable(obj, "ddl").map_err(de::Error::custom)?,
            tag_workflow_id: parse_nullable(obj, "tag_workflow_id").map_err(de::Error::custom)?,
            current_step_index: parse_optional(obj, "current_step_index")
                .map_err(de::Error::custom)?,
            period_type: parse_nullable(obj, "period_type").map_err(de::Error::custom)?,
            period_value: parse_nullable(obj, "period_value").map_err(de::Error::custom)?,
            status: parse_optional(obj, "status").map_err(de::Error::custom)?,
        })
    }
}

#[derive(Debug, Deserialize)]
pub struct CreateCategoryRequest {
    pub name: String,
    pub color: String,
    #[serde(default)]
    pub icon: String,
    #[serde(default)]
    pub sort_order: i32,
}

#[derive(Debug, Deserialize)]
pub struct UpdateCategoryRequest {
    pub id: String,
    pub name: Option<String>,
    pub color: Option<String>,
    pub icon: Option<String>,
    pub sort_order: Option<i32>,
}

#[derive(Debug, Deserialize)]
pub struct CreateTagWorkflowRequest {
    pub name: String,
    pub steps: String, // JSON array string e.g. '["step1","step2"]'
}

#[derive(Debug, Deserialize)]
pub struct UpdateTagWorkflowRequest {
    pub id: String,
    pub name: Option<String>,
    pub steps: Option<String>,
}

// ============================================================
// Tests: verify that the tri-state nullable deserialization
// correctly distinguishes absent / explicit-null / set.
// ============================================================

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_update_plan_nullable_absent() {
        // "ddl" key not present → outer None (don't update)
        let json = r#"{"id":"abc"}"#;
        let req: UpdatePlanRequest = serde_json::from_str(json).unwrap();
        assert_eq!(req.id, "abc");
        assert!(req.ddl.is_none()); // outer None = absent
        assert!(req.category_id.is_none());
    }

    #[test]
    fn test_update_plan_nullable_explicit_null() {
        // "ddl" key present with null → outer Some, inner None (clear to NULL)
        let json = r#"{"id":"abc","ddl":null}"#;
        let req: UpdatePlanRequest = serde_json::from_str(json).unwrap();
        assert_eq!(req.id, "abc");
        assert!(req.ddl.is_some()); // outer Some = key present
        assert!(req.ddl.unwrap().is_none()); // inner None = explicit null
    }

    #[test]
    fn test_update_plan_nullable_set() {
        // "ddl" key present with a value → outer Some, inner Some (set to value)
        let json = r#"{"id":"abc","ddl":"2026-12-31T00:00:00Z"}"#;
        let req: UpdatePlanRequest = serde_json::from_str(json).unwrap();
        assert_eq!(req.id, "abc");
        let ddl = req.ddl.unwrap();
        assert!(ddl.is_some());
        assert_eq!(ddl.unwrap(), "2026-12-31T00:00:00Z");
    }

    #[test]
    fn test_create_plan_request_accepts_half_step_importance() {
        // 滑块步进 0.5，2.5 恰为象限阈值临界值，必须能被后端解析（RED: 当前 i32 解析失败）
        let json = r#"{"title":"临界任务","importance":2.5,"urgency":2.5}"#;
        let req: CreatePlanRequest = serde_json::from_str(json).unwrap();
        assert_eq!(req.importance, 2.5);
        assert_eq!(req.urgency, 2.5);
    }

    #[test]
    fn test_update_plan_request_accepts_half_step_importance() {
        let json = r#"{"id":"plan-1","importance":2.5,"urgency":1.5}"#;
        let req: UpdatePlanRequest = serde_json::from_str(json).unwrap();
        assert_eq!(req.importance, Some(2.5));
        assert_eq!(req.urgency, Some(1.5));
    }

    #[test]
    fn test_update_plan_mixed_fields() {
        // Combine absent, explicit-null, and set in one request
        let json = r#"{
            "id": "plan-1",
            "title": "new title",
            "category_id": null,
            "ddl": "2026-12-31T00:00:00Z"
        }"#;
        let req: UpdatePlanRequest = serde_json::from_str(json).unwrap();
        assert_eq!(req.id, "plan-1");
        // title: present with value
        assert_eq!(req.title, Some("new title".to_string()));
        // description: absent
        assert!(req.description.is_none());
        // category_id: explicit null → clear
        assert!(req.category_id.is_some());
        assert!(req.category_id.unwrap().is_none());
        // ddl: present with value → set
        assert!(req.ddl.is_some());
        assert_eq!(req.ddl.unwrap(), Some("2026-12-31T00:00:00Z".to_string()));
        // parent_id: absent
        assert!(req.parent_id.is_none());
    }
}
