use serde::{Deserialize, Serialize};

// Error response
#[derive(Debug, Deserialize)]
pub struct PagerDutyError {
    pub error: ErrorDetail,
}

#[derive(Debug, Deserialize)]
#[allow(dead_code)]
pub struct ErrorDetail {
    pub message: String,
    pub code: Option<i32>,
}

// User
#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct User {
    pub id: String,
    pub name: String,
    pub email: String,
    #[serde(default)]
    pub time_zone: Option<String>,
    #[serde(default)]
    pub role: Option<String>,
}

// Incident
#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct Incident {
    pub id: String,
    pub incident_number: u64,
    pub title: String,
    pub status: String,
    pub urgency: String,
    #[serde(default)]
    pub priority: Option<Priority>,
    pub service: ServiceReference,
    #[serde(default)]
    pub assignments: Vec<Assignment>,
    pub created_at: String,
    #[serde(default)]
    pub last_status_change_at: Option<String>,
    #[serde(default)]
    pub body: Option<IncidentBody>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct Priority {
    pub id: String,
    pub name: String,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct ServiceReference {
    pub id: String,
    #[serde(default)]
    pub summary: Option<String>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct Assignment {
    pub assignee: Assignee,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct Assignee {
    pub id: String,
    #[serde(default)]
    pub summary: Option<String>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct IncidentBody {
    #[serde(default)]
    pub details: Option<serde_json::Value>,
}

#[derive(Debug, Deserialize)]
#[allow(dead_code)]
pub struct IncidentsResponse {
    pub incidents: Vec<Incident>,
    pub limit: u32,
    pub offset: u32,
    pub more: bool,
    #[serde(default)]
    pub total: Option<u32>,
}

// Note
#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct Note {
    pub id: String,
    pub content: String,
    pub created_at: String,
    #[serde(default)]
    pub user: Option<User>,
}

// On-call
#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct OnCall {
    pub user: UserRef,
    #[serde(default)]
    pub schedule: Option<ScheduleReference>,
    #[serde(default)]
    pub escalation_policy: Option<EscalationPolicyReference>,
    pub escalation_level: u32,
    #[serde(default)]
    pub start: Option<String>,
    #[serde(default)]
    pub end: Option<String>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct UserRef {
    pub id: String,
    #[serde(default)]
    pub summary: Option<String>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct ScheduleReference {
    pub id: String,
    #[serde(default)]
    pub summary: Option<String>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct EscalationPolicyReference {
    pub id: String,
    #[serde(default)]
    pub summary: Option<String>,
}

#[derive(Debug, Deserialize)]
#[allow(dead_code)]
pub struct OnCallsResponse {
    pub oncalls: Vec<OnCall>,
    pub limit: u32,
    pub offset: u32,
    pub more: bool,
}

// Schedule
#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct Schedule {
    pub id: String,
    pub name: String,
    #[serde(default)]
    pub description: Option<String>,
    pub time_zone: String,
    #[serde(default)]
    pub schedule_layers: Vec<ScheduleLayer>,
    #[serde(default)]
    pub users: Vec<User>,
    #[serde(default)]
    pub final_schedule: Option<FinalSchedule>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct ScheduleLayer {
    pub id: String,
    pub name: String,
    pub start: String,
    #[serde(default)]
    pub end: Option<String>,
    #[serde(default)]
    pub users: Vec<UserReference>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct UserReference {
    pub user: User,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct FinalSchedule {
    #[serde(default)]
    pub rendered_schedule_entries: Vec<RenderedScheduleEntry>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct RenderedScheduleEntry {
    pub start: String,
    pub end: String,
    pub user: User,
}

// Service
#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct Service {
    pub id: String,
    pub name: String,
    #[serde(default)]
    pub description: Option<String>,
    pub status: String,
    #[serde(default)]
    pub escalation_policy: Option<EscalationPolicyReference>,
}

#[derive(Debug, Deserialize)]
#[allow(dead_code)]
pub struct ServicesResponse {
    pub services: Vec<Service>,
    pub limit: u32,
    pub offset: u32,
    pub more: bool,
}

// Schedules list response
#[derive(Debug, Deserialize)]
#[allow(dead_code)]
pub struct SchedulesResponse {
    pub schedules: Vec<ScheduleSummary>,
    pub limit: u32,
    pub offset: u32,
    pub more: bool,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct ScheduleSummary {
    pub id: String,
    pub name: String,
    #[serde(default)]
    pub description: Option<String>,
    #[serde(default)]
    pub time_zone: Option<String>,
}

// Users list response
#[derive(Debug, Deserialize)]
#[allow(dead_code)]
pub struct UsersResponse {
    pub users: Vec<User>,
    pub limit: u32,
    pub offset: u32,
    pub more: bool,
}

// Escalation Policies
#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct EscalationPolicy {
    pub id: String,
    pub name: String,
    #[serde(default)]
    pub description: Option<String>,
    #[serde(default)]
    pub num_loops: Option<u32>,
    #[serde(default)]
    pub escalation_rules: Vec<EscalationRule>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct EscalationRule {
    pub id: String,
    pub escalation_delay_in_minutes: u32,
    #[serde(default)]
    pub targets: Vec<EscalationTarget>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct EscalationTarget {
    pub id: String,
    #[serde(rename = "type")]
    pub target_type: String,
    #[serde(default)]
    pub summary: Option<String>,
}

#[derive(Debug, Deserialize)]
#[allow(dead_code)]
pub struct EscalationPoliciesResponse {
    pub escalation_policies: Vec<EscalationPolicy>,
    pub limit: u32,
    pub offset: u32,
    pub more: bool,
}
