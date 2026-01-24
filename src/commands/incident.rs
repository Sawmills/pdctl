use crate::client::PagerDutyClient;
use crate::models::Incident;
use crate::table;
use anyhow::Result;

pub async fn list(
    json: bool,
    status: Option<Vec<String>>,
    service: Option<Vec<String>>,
    urgency: Option<Vec<String>>,
    limit: u32,
    since: Option<String>,
    until: Option<String>,
) -> Result<()> {
    let client = PagerDutyClient::new()?;

    let status_refs: Option<Vec<&str>> = status
        .as_ref()
        .map(|v| v.iter().map(|s| s.as_str()).collect());
    let service_refs: Option<Vec<&str>> = service
        .as_ref()
        .map(|v| v.iter().map(|s| s.as_str()).collect());
    let urgency_refs: Option<Vec<&str>> = urgency
        .as_ref()
        .map(|v| v.iter().map(|s| s.as_str()).collect());

    let response = client
        .list_incidents(
            status_refs.as_deref(),
            service_refs.as_deref(),
            urgency_refs.as_deref(),
            limit,
            0,
            since.as_deref(),
            until.as_deref(),
        )
        .await?;

    if json {
        println!("{}", serde_json::to_string_pretty(&response.incidents)?);
    } else {
        print_incidents_table(&response.incidents);
    }

    Ok(())
}

fn print_incidents_table(incidents: &[Incident]) {
    if incidents.is_empty() {
        println!("No incidents found.");
        return;
    }

    let mut table = table::new();
    table.set_header(vec![
        "ID", "Status", "Urgency", "Service", "Title", "Updated",
    ]);

    for incident in incidents {
        let service_name = incident
            .service
            .summary
            .as_deref()
            .unwrap_or(&incident.service.id);
        let updated = incident
            .last_status_change_at
            .as_deref()
            .unwrap_or(&incident.created_at);
        // Truncate title to 40 chars
        let title = if incident.title.len() > 40 {
            format!("{}...", &incident.title[..37])
        } else {
            incident.title.clone()
        };

        table.add_row(vec![
            &incident.id,
            &incident.status,
            &incident.urgency,
            service_name,
            &title,
            updated,
        ]);
    }

    println!("{table}");
}

pub async fn view(json: bool, id: &str) -> Result<()> {
    let client = PagerDutyClient::new()?;
    let incident = client.get_incident(id).await?;

    if json {
        println!("{}", serde_json::to_string_pretty(&incident)?);
    } else {
        let mut table = table::new();
        table.set_header(vec!["Field", "Value"]);
        table.add_row(vec!["ID", &incident.id]);
        table.add_row(vec!["Number", &incident.incident_number.to_string()]);
        table.add_row(vec!["Title", &incident.title]);
        table.add_row(vec!["Status", &incident.status]);
        table.add_row(vec!["Urgency", &incident.urgency]);
        table.add_row(vec![
            "Priority",
            incident
                .priority
                .as_ref()
                .map(|p| p.name.as_str())
                .unwrap_or("N/A"),
        ]);
        table.add_row(vec![
            "Service",
            incident
                .service
                .summary
                .as_deref()
                .unwrap_or(&incident.service.id),
        ]);
        table.add_row(vec!["Created", &incident.created_at]);
        table.add_row(vec![
            "Updated",
            incident
                .last_status_change_at
                .as_deref()
                .unwrap_or(&incident.created_at),
        ]);

        // Show assignees
        let assignees: Vec<String> = incident
            .assignments
            .iter()
            .map(|a| {
                a.assignee
                    .summary
                    .clone()
                    .unwrap_or_else(|| a.assignee.id.clone())
            })
            .collect();
        let assignees_str = if assignees.is_empty() {
            "None".to_string()
        } else {
            assignees.join(", ")
        };
        table.add_row(vec!["Assignees", &assignees_str]);

        println!("{table}");

        if let Some(body) = &incident.body {
            if let Some(details) = &body.details {
                println!("\nCustom Details:");
                print_custom_details(details, 0);
            }
        }
    }

    Ok(())
}

fn print_custom_details(value: &serde_json::Value, indent: usize) {
    let prefix = "  ".repeat(indent);
    match value {
        serde_json::Value::Object(map) => {
            for (key, val) in map {
                match val {
                    serde_json::Value::Object(_) => {
                        println!("{}{}: ", prefix, key);
                        print_custom_details(val, indent + 1);
                    }
                    serde_json::Value::Array(arr) => {
                        println!("{}{}: ", prefix, key);
                        for item in arr {
                            print_custom_details(item, indent + 1);
                        }
                    }
                    serde_json::Value::String(s) if !s.is_empty() => {
                        println!("{}  {}: {}", prefix, key, s);
                    }
                    serde_json::Value::Number(n) => {
                        println!("{}  {}: {}", prefix, key, n);
                    }
                    serde_json::Value::Bool(b) => {
                        println!("{}  {}: {}", prefix, key, b);
                    }
                    _ => {}
                }
            }
        }
        serde_json::Value::String(s) if !s.is_empty() => {
            println!("{}- {}", prefix, s);
        }
        _ => {}
    }
}

pub async fn ack(json: bool, id: &str) -> Result<()> {
    let client = PagerDutyClient::new()?;
    let incident = client
        .update_incident(id, Some("acknowledged"), None)
        .await?;

    if json {
        println!("{}", serde_json::to_string_pretty(&incident)?);
    } else {
        println!("Incident {} acknowledged.", incident.id);
    }

    Ok(())
}

pub async fn resolve(json: bool, id: &str) -> Result<()> {
    let client = PagerDutyClient::new()?;
    let incident = client.update_incident(id, Some("resolved"), None).await?;

    if json {
        println!("{}", serde_json::to_string_pretty(&incident)?);
    } else {
        println!("Incident {} resolved.", incident.id);
    }

    Ok(())
}

pub async fn note(json: bool, id: &str, message: &str) -> Result<()> {
    let client = PagerDutyClient::new()?;
    let note = client.add_incident_note(id, message).await?;

    if json {
        println!("{}", serde_json::to_string_pretty(&note)?);
    } else {
        println!("Note added to incident {}.", id);
    }

    Ok(())
}

pub async fn reassign(json: bool, id: &str, to: &str) -> Result<()> {
    use crate::client::{AssigneeRef, AssignmentInput};

    let client = PagerDutyClient::new()?;

    let assignments = vec![AssignmentInput {
        assignee: AssigneeRef {
            id: to.to_string(),
            ref_type: "user_reference".to_string(),
        },
    }];

    let incident = client.update_incident(id, None, Some(assignments)).await?;

    if json {
        println!("{}", serde_json::to_string_pretty(&incident)?);
    } else {
        println!("Incident {} reassigned to {}.", incident.id, to);
    }

    Ok(())
}
