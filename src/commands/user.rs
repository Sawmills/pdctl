use crate::client::PagerDutyClient;
use crate::models::User;
use crate::table;
use anyhow::Result;

pub async fn list(json: bool, limit: u32) -> Result<()> {
    let client = PagerDutyClient::new()?;
    let response = client.list_users(limit, 0).await?;

    if json {
        println!("{}", serde_json::to_string_pretty(&response.users)?);
    } else {
        print_user_list(&response.users);
    }

    Ok(())
}

fn print_user_list(users: &[User]) {
    if users.is_empty() {
        println!("No users found.");
        return;
    }

    let mut table = table::new();
    table.set_header(vec!["ID", "Name", "Email", "Role"]);

    for user in users {
        table.add_row(vec![
            &user.id,
            &user.name,
            &user.email,
            user.role.as_deref().unwrap_or("N/A"),
        ]);
    }

    println!("{table}");
}
