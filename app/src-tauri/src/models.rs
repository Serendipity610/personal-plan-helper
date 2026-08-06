use serde::{Deserialize, Serialize};

/// 计划分类
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Category {
    pub id: String,
    pub name: String,
    pub color: String,
    pub icon: String,
    pub sort_order: i32,
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
    pub importance: i32,
    pub urgency: i32,
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
pub struct PlanLog {
    pub id: String,
    pub plan_id: String,
    pub action: String,
    pub detail: String,
    pub created_at: String,
}

// --- Request DTOs (used for create/update from frontend) ---

#[derive(Debug, Deserialize)]
pub struct CreatePlanRequest {
    pub title: String,
    #[serde(default)]
    pub description: String,
    pub category_id: Option<String>,
    pub parent_id: Option<String>,
    #[serde(default)]
    pub importance: i32,
    #[serde(default)]
    pub urgency: i32,
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

#[derive(Debug, Deserialize)]
pub struct UpdatePlanRequest {
    pub id: String,
    pub title: Option<String>,
    pub description: Option<String>,
    pub category_id: Option<Option<String>>,
    pub parent_id: Option<Option<String>>,
    pub importance: Option<i32>,
    pub urgency: Option<i32>,
    pub ddl: Option<Option<String>>,
    pub tag_workflow_id: Option<Option<String>>,
    pub current_step_index: Option<i32>,
    pub period_type: Option<Option<String>>,
    pub period_value: Option<Option<String>>,
    pub status: Option<String>,
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
pub struct CreateTagWorkflowRequest {
    pub name: String,
    pub steps: String, // JSON array string e.g. '["step1","step2"]'
}
