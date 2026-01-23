use crate::client::PagerDutyClient;
use anyhow::Result;
use comfy_table::{presets::UTF8_FULL, Table};

pub async fn run(json: bool) -> Result<()> {
    let client = PagerDutyClient::new()?;
    let user = client.get_current_user().await?;

    if json {
        println!("{}", serde_json::to_string_pretty(&user)?);
    } else {
        let mut table = Table::new();
        table.load_preset(UTF8_FULL);
        table.set_header(vec!["Field", "Value"]);
        table.add_row(vec!["ID", &user.id]);
        table.add_row(vec!["Name", &user.name]);
        table.add_row(vec!["Email", &user.email]);
        table.add_row(vec!["Role", user.role.as_deref().unwrap_or("N/A")]);
        table.add_row(vec!["Timezone", user.time_zone.as_deref().unwrap_or("N/A")]);
        println!("{table}");
    }

    Ok(())
}
