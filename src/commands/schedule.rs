use crate::client::PagerDutyClient;
use crate::models::{Schedule, ScheduleSummary};
use crate::table;
use anyhow::Result;
use chrono::{DateTime, Local};

fn format_datetime(iso: &str) -> String {
    DateTime::parse_from_rfc3339(iso)
        .map(|dt| {
            let local = dt.with_timezone(&Local);
            let tz_abbrev = match local.format("%Z").to_string().as_str() {
                "-08:00" => "PST",
                "-07:00" => "PDT",
                "+02:00" => "IST",
                "+03:00" => "IDT",
                "+00:00" => "UTC",
                other => return format!("{} {}", local.format("%a %b %d %I:%M%p"), other),
            };
            format!("{} {}", local.format("%a %b %d %I:%M%p"), tz_abbrev)
        })
        .unwrap_or_else(|_| iso.to_string())
}

pub async fn list(json: bool, limit: u32) -> Result<()> {
    let client = PagerDutyClient::new()?;
    let response = client.list_schedules(limit, 0).await?;

    if json {
        println!("{}", serde_json::to_string_pretty(&response.schedules)?);
    } else {
        print_schedule_list(&response.schedules);
    }

    Ok(())
}

fn print_schedule_list(schedules: &[ScheduleSummary]) {
    if schedules.is_empty() {
        println!("No schedules found.");
        return;
    }

    let mut table = table::new();
    table.set_header(vec!["ID", "Name", "Time Zone", "Description"]);

    for schedule in schedules {
        table.add_row(vec![
            &schedule.id,
            &schedule.name,
            schedule.time_zone.as_deref().unwrap_or("N/A"),
            schedule
                .description
                .as_deref()
                .unwrap_or("")
                .chars()
                .take(40)
                .collect::<String>()
                .as_str(),
        ]);
    }

    println!("{table}");
}

pub async fn view(json: bool, id: &str) -> Result<()> {
    let client = PagerDutyClient::new()?;
    let schedule = client.get_schedule(id).await?;

    if json {
        println!("{}", serde_json::to_string_pretty(&schedule)?);
    } else {
        print_schedule_details(&schedule);
    }

    Ok(())
}

fn print_schedule_details(schedule: &Schedule) {
    let mut table = table::new();
    table.set_header(vec!["Field", "Value"]);

    table.add_row(vec!["ID", &schedule.id]);
    table.add_row(vec!["Name", &schedule.name]);
    table.add_row(vec!["Time Zone", &schedule.time_zone]);
    table.add_row(vec![
        "Description",
        schedule.description.as_deref().unwrap_or("N/A"),
    ]);

    println!("{table}");

    if !schedule.schedule_layers.is_empty() {
        println!("\nSchedule Layers:");
        let mut layers_table = table::new();
        layers_table.set_header(vec!["Layer", "Start", "End", "Users"]);

        for layer in &schedule.schedule_layers {
            let users: Vec<String> = layer
                .users
                .iter()
                .map(|u| {
                    u.user.name.clone().unwrap_or_else(|| {
                        u.user.summary.clone().unwrap_or_else(|| u.user.id.clone())
                    })
                })
                .collect();
            let users_str = users.join(", ");

            let start = format_datetime(&layer.start);
            let end = layer
                .end
                .as_ref()
                .map(|e| format_datetime(e))
                .unwrap_or_else(|| "Ongoing".to_string());

            layers_table.add_row(vec![&layer.name, &start, &end, &users_str]);
        }

        println!("{layers_table}");
    }

    if let Some(final_schedule) = &schedule.final_schedule {
        if !final_schedule.rendered_schedule_entries.is_empty() {
            println!("\nCurrent Rotation (times shown in your local timezone):");
            let mut rotation_table = table::new();
            rotation_table.set_header(vec!["User", "Start", "End"]);

            for entry in &final_schedule.rendered_schedule_entries {
                let user_name = entry
                    .user
                    .name
                    .as_deref()
                    .or(entry.user.summary.as_deref())
                    .unwrap_or(&entry.user.id);
                let start = format_datetime(&entry.start);
                let end = format_datetime(&entry.end);
                rotation_table.add_row(vec![user_name, &start, &end]);
            }

            println!("{rotation_table}");
        }
    }
}
