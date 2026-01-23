use crate::client::PagerDutyClient;
use crate::models::OnCall;
use anyhow::Result;
use comfy_table::{presets::UTF8_FULL, Table};

pub async fn list(json: bool, schedule: Option<Vec<String>>, limit: u32) -> Result<()> {
    let client = PagerDutyClient::new()?;

    // Convert Option<Vec<String>> to Option<&[&str]> for the client
    let schedule_refs: Option<Vec<&str>> = schedule
        .as_ref()
        .map(|v| v.iter().map(|s| s.as_str()).collect());

    let response = client
        .list_oncalls(schedule_refs.as_deref(), limit, 0)
        .await?;

    if json {
        println!("{}", serde_json::to_string_pretty(&response.oncalls)?);
    } else {
        print_oncalls_table(&response.oncalls);
    }

    Ok(())
}

fn print_oncalls_table(oncalls: &[OnCall]) {
    if oncalls.is_empty() {
        println!("No on-call users found.");
        return;
    }

    let mut table = Table::new();
    table.load_preset(UTF8_FULL);
    table.set_header(vec![
        "User",
        "Schedule",
        "Escalation Policy",
        "Level",
        "Start",
        "End",
    ]);

    for oncall in oncalls {
        let user_name = oncall.user.summary.as_deref().unwrap_or(&oncall.user.id);

        let schedule_name = oncall
            .schedule
            .as_ref()
            .and_then(|s| s.summary.as_deref())
            .unwrap_or("N/A");

        let escalation_policy = oncall
            .escalation_policy
            .as_ref()
            .and_then(|ep| ep.summary.as_deref())
            .unwrap_or("N/A");

        let start = oncall.start.as_deref().unwrap_or("N/A");
        let end = oncall.end.as_deref().unwrap_or("N/A");

        table.add_row(vec![
            user_name,
            schedule_name,
            escalation_policy,
            &oncall.escalation_level.to_string(),
            start,
            end,
        ]);
    }

    println!("{table}");
}
