use crate::client::PagerDutyClient;
use crate::models::Schedule;
use crate::table;
use anyhow::Result;

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
            let users: Vec<String> = layer.users.iter().map(|u| u.user.name.clone()).collect();
            let users_str = users.join(", ");

            layers_table.add_row(vec![
                &layer.name,
                &layer.start,
                layer.end.as_deref().unwrap_or("N/A"),
                &users_str,
            ]);
        }

        println!("{layers_table}");
    }

    if let Some(final_schedule) = &schedule.final_schedule {
        if !final_schedule.rendered_schedule_entries.is_empty() {
            println!("\nCurrent Rotation:");
            let mut rotation_table = table::new();
            rotation_table.set_header(vec!["User", "Start", "End"]);

            for entry in &final_schedule.rendered_schedule_entries {
                rotation_table.add_row(vec![&entry.user.name, &entry.start, &entry.end]);
            }

            println!("{rotation_table}");
        }
    }
}
