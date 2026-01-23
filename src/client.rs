use crate::models::{
    EscalationPoliciesResponse, Incident, IncidentsResponse, Note, OnCallsResponse, PagerDutyError,
    Schedule, SchedulesResponse, ServicesResponse, User, UsersResponse,
};
use reqwest::Client;
use thiserror::Error;

const BASE_URL: &str = "https://api.pagerduty.com";

#[derive(Error, Debug)]
pub enum PagerDutyClientError {
    #[error(
        "PAGERDUTY_TOKEN environment variable not set. Get your API token from https://support.pagerduty.com/docs/api-access-keys"
    )]
    MissingToken,
    #[error("HTTP error: {0}")]
    Http(#[from] reqwest::Error),
    #[error("PagerDuty API error: {0}")]
    Api(String),
    #[error("Rate limited. Retry after {0} seconds")]
    RateLimited(u64),
}

pub struct PagerDutyClient {
    client: Client,
    token: String,
}

impl PagerDutyClient {
    pub fn new() -> Result<Self, PagerDutyClientError> {
        let token =
            std::env::var("PAGERDUTY_TOKEN").map_err(|_| PagerDutyClientError::MissingToken)?;

        Ok(Self {
            client: Client::new(),
            token,
        })
    }

    fn request(&self, method: reqwest::Method, path: &str) -> reqwest::RequestBuilder {
        self.client
            .request(method, format!("{}{}", BASE_URL, path))
            .header("Authorization", format!("Token token={}", self.token))
            .header("Accept", "application/vnd.pagerduty+json;version=2")
            .header("Content-Type", "application/json")
    }

    async fn handle_response<T: serde::de::DeserializeOwned>(
        &self,
        resp: reqwest::Response,
    ) -> Result<T, PagerDutyClientError> {
        if resp.status() == 429 {
            let reset = resp
                .headers()
                .get("X-Rate-Limit-Reset")
                .and_then(|h| h.to_str().ok())
                .and_then(|s| s.parse::<u64>().ok())
                .unwrap_or(60);
            return Err(PagerDutyClientError::RateLimited(reset));
        }

        if !resp.status().is_success() {
            let err: PagerDutyError = resp.json().await.unwrap_or_else(|_| PagerDutyError {
                error: crate::models::ErrorDetail {
                    message: "Unknown error".to_string(),
                    code: None,
                },
            });
            return Err(PagerDutyClientError::Api(err.error.message));
        }

        Ok(resp.json().await?)
    }

    // User endpoints
    pub async fn get_current_user(&self) -> Result<User, PagerDutyClientError> {
        let resp = self
            .request(reqwest::Method::GET, "/users/me")
            .send()
            .await?;
        let wrapper: UserResponse = self.handle_response(resp).await?;
        Ok(wrapper.user)
    }

    // Incident endpoints
    pub async fn list_incidents(
        &self,
        statuses: Option<&[&str]>,
        service_ids: Option<&[&str]>,
        urgencies: Option<&[&str]>,
        limit: u32,
        offset: u32,
    ) -> Result<IncidentsResponse, PagerDutyClientError> {
        let mut url = format!("/incidents?limit={}&offset={}", limit, offset);

        if let Some(s) = statuses {
            for status in s {
                url.push_str(&format!("&statuses[]={}", status));
            }
        }
        if let Some(s) = service_ids {
            for id in s {
                url.push_str(&format!("&service_ids[]={}", id));
            }
        }
        if let Some(u) = urgencies {
            for urgency in u {
                url.push_str(&format!("&urgencies[]={}", urgency));
            }
        }

        let resp = self.request(reqwest::Method::GET, &url).send().await?;
        self.handle_response(resp).await
    }

    pub async fn get_incident(&self, id: &str) -> Result<Incident, PagerDutyClientError> {
        let resp = self
            .request(reqwest::Method::GET, &format!("/incidents/{}", id))
            .send()
            .await?;
        let wrapper: IncidentResponse = self.handle_response(resp).await?;
        Ok(wrapper.incident)
    }

    pub async fn update_incident(
        &self,
        id: &str,
        status: Option<&str>,
        assignees: Option<Vec<AssignmentInput>>,
    ) -> Result<Incident, PagerDutyClientError> {
        let mut incident = serde_json::json!({
            "id": id,
            "type": "incident_reference"
        });

        if let Some(s) = status {
            incident["status"] = serde_json::json!(s);
        }
        if let Some(a) = assignees {
            incident["assignments"] = serde_json::json!(a);
        }

        let body = serde_json::json!({ "incident": incident });

        let resp = self
            .request(reqwest::Method::PUT, &format!("/incidents/{}", id))
            .json(&body)
            .send()
            .await?;
        let wrapper: IncidentResponse = self.handle_response(resp).await?;
        Ok(wrapper.incident)
    }

    pub async fn add_incident_note(
        &self,
        incident_id: &str,
        content: &str,
    ) -> Result<Note, PagerDutyClientError> {
        let body = serde_json::json!({
            "note": {
                "content": content
            }
        });

        let resp = self
            .request(
                reqwest::Method::POST,
                &format!("/incidents/{}/notes", incident_id),
            )
            .json(&body)
            .send()
            .await?;
        let wrapper: NoteResponse = self.handle_response(resp).await?;
        Ok(wrapper.note)
    }

    // On-call endpoints
    pub async fn list_oncalls(
        &self,
        schedule_ids: Option<&[&str]>,
        limit: u32,
        offset: u32,
    ) -> Result<OnCallsResponse, PagerDutyClientError> {
        let mut url = format!("/oncalls?limit={}&offset={}", limit, offset);

        if let Some(ids) = schedule_ids {
            for id in ids {
                url.push_str(&format!("&schedule_ids[]={}", id));
            }
        }

        let resp = self.request(reqwest::Method::GET, &url).send().await?;
        self.handle_response(resp).await
    }

    // Schedule endpoints
    pub async fn get_schedule(&self, id: &str) -> Result<Schedule, PagerDutyClientError> {
        let resp = self
            .request(
                reqwest::Method::GET,
                &format!(
                    "/schedules/{}?include[]=schedule_layers&include[]=users",
                    id
                ),
            )
            .send()
            .await?;
        let wrapper: ScheduleResponse = self.handle_response(resp).await?;
        Ok(wrapper.schedule)
    }

    // Service endpoints
    pub async fn list_services(
        &self,
        limit: u32,
        offset: u32,
    ) -> Result<ServicesResponse, PagerDutyClientError> {
        let url = format!("/services?limit={}&offset={}", limit, offset);
        let resp = self.request(reqwest::Method::GET, &url).send().await?;
        self.handle_response(resp).await
    }

    pub async fn list_schedules(
        &self,
        limit: u32,
        offset: u32,
    ) -> Result<SchedulesResponse, PagerDutyClientError> {
        let url = format!("/schedules?limit={}&offset={}", limit, offset);
        let resp = self.request(reqwest::Method::GET, &url).send().await?;
        self.handle_response(resp).await
    }

    pub async fn list_users(
        &self,
        limit: u32,
        offset: u32,
    ) -> Result<UsersResponse, PagerDutyClientError> {
        let url = format!("/users?limit={}&offset={}", limit, offset);
        let resp = self.request(reqwest::Method::GET, &url).send().await?;
        self.handle_response(resp).await
    }

    pub async fn list_escalation_policies(
        &self,
        limit: u32,
        offset: u32,
    ) -> Result<EscalationPoliciesResponse, PagerDutyClientError> {
        let url = format!("/escalation_policies?limit={}&offset={}", limit, offset);
        let resp = self.request(reqwest::Method::GET, &url).send().await?;
        self.handle_response(resp).await
    }
}

// Response wrappers
#[derive(serde::Deserialize)]
struct UserResponse {
    user: User,
}

#[derive(serde::Deserialize)]
struct IncidentResponse {
    incident: Incident,
}

#[derive(serde::Deserialize)]
struct NoteResponse {
    note: Note,
}

#[derive(serde::Deserialize)]
struct ScheduleResponse {
    schedule: Schedule,
}

#[derive(serde::Serialize)]
pub struct AssignmentInput {
    pub assignee: AssigneeRef,
}

#[derive(serde::Serialize)]
pub struct AssigneeRef {
    pub id: String,
    #[serde(rename = "type")]
    pub ref_type: String,
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::Mutex;

    static TEST_LOCK: std::sync::OnceLock<Mutex<()>> = std::sync::OnceLock::new();

    fn get_lock() -> &'static Mutex<()> {
        TEST_LOCK.get_or_init(|| Mutex::new(()))
    }

    #[test]
    fn test_client_missing_token() {
        let _lock = get_lock().lock().unwrap();
        std::env::remove_var("PAGERDUTY_TOKEN");
        let result = PagerDutyClient::new();
        assert!(matches!(result, Err(PagerDutyClientError::MissingToken)));
    }

    #[test]
    fn test_client_with_token() {
        let _lock = get_lock().lock().unwrap();
        std::env::set_var("PAGERDUTY_TOKEN", "test_token");
        let result = PagerDutyClient::new();
        assert!(result.is_ok());
        std::env::remove_var("PAGERDUTY_TOKEN");
    }
}
