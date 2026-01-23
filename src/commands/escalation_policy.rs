use crate::client::PagerDutyClient;
use crate::models::EscalationPolicy;
use crate::table;
use anyhow::Result;

pub async fn list(json: bool, limit: u32) -> Result<()> {
    let client = PagerDutyClient::new()?;
    let response = client.list_escalation_policies(limit, 0).await?;

    if json {
        println!(
            "{}",
            serde_json::to_string_pretty(&response.escalation_policies)?
        );
    } else {
        print_policy_list(&response.escalation_policies);
    }

    Ok(())
}

fn print_policy_list(policies: &[EscalationPolicy]) {
    if policies.is_empty() {
        println!("No escalation policies found.");
        return;
    }

    let mut table = table::new();
    table.set_header(vec!["ID", "Name", "Loops", "Description"]);

    for policy in policies {
        table.add_row(vec![
            &policy.id,
            &policy.name,
            &policy.num_loops.map(|n| n.to_string()).unwrap_or_default(),
            policy
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
