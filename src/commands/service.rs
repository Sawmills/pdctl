use crate::client::PagerDutyClient;
use crate::models::Service;
use anyhow::Result;
use comfy_table::{presets::UTF8_FULL, Table};

pub async fn list(json: bool, limit: u32) -> Result<()> {
    let client = PagerDutyClient::new()?;
    let response = client.list_services(limit, 0).await?;

    if json {
        println!("{}", serde_json::to_string_pretty(&response.services)?);
    } else {
        print_services_table(&response.services);
    }

    Ok(())
}

fn print_services_table(services: &[Service]) {
    if services.is_empty() {
        println!("No services found.");
        return;
    }

    let mut table = Table::new();
    table.load_preset(UTF8_FULL);
    table.set_header(vec!["ID", "Name", "Status"]);

    for service in services {
        table.add_row(vec![&service.id, &service.name, &service.status]);
    }

    println!("{table}");
}

pub async fn status(json: bool) -> Result<()> {
    let client = PagerDutyClient::new()?;
    let response = client.list_services(100, 0).await?;

    let active_count = response
        .services
        .iter()
        .filter(|s| s.status == "active")
        .count();
    let disabled_count = response
        .services
        .iter()
        .filter(|s| s.status == "disabled")
        .count();
    let impacted_count = response
        .services
        .iter()
        .filter(|s| s.status == "impacted")
        .count();

    if json {
        let summary = serde_json::json!({
            "active": active_count,
            "disabled": disabled_count,
            "impacted": impacted_count,
            "total": response.services.len()
        });
        println!("{}", serde_json::to_string_pretty(&summary)?);
    } else {
        println!("Service Status Summary:");
        println!("  Active:   {}", active_count);
        println!("  Disabled: {}", disabled_count);
        println!("  Impacted: {}", impacted_count);
        println!("  Total:    {}", response.services.len());
    }

    Ok(())
}
