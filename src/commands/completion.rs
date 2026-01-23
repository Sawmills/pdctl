use clap::CommandFactory;
use clap_complete::{generate, Shell};
use std::io::{self, Write};

pub fn run(shell: Shell) {
    let mut cmd = crate::Cli::command();

    match shell {
        Shell::Zsh => {
            let mut buf = Vec::new();
            generate(shell, &mut cmd, "pdctl", &mut buf);
            let completion = String::from_utf8(buf).unwrap();

            let custom_functions = r#"
# Dynamic completion for incident IDs
_pdctl_incident_ids() {
    local -a incidents
    if incidents=(${(f)"$(pdctl --json incident list --limit 20 2>/dev/null | jq -r '.[] | "\(.id):\(.title[0:40])"' 2>/dev/null)"}); then
        _describe -t incidents 'incidents' incidents
    fi
}

# Dynamic completion for service IDs  
_pdctl_service_ids() {
    local -a services
    if services=(${(f)"$(pdctl --json service list --limit 50 2>/dev/null | jq -r '.[] | "\(.id):\(.name)"' 2>/dev/null)"}); then
        _describe -t services 'services' services
    fi
}

# Dynamic completion for schedule IDs
_pdctl_schedule_ids() {
    local -a schedules
    if schedules=(${(f)"$(pdctl --json oncall list --limit 20 2>/dev/null | jq -r '.[].schedule | select(. != null) | "\(.id):\(.summary)"' 2>/dev/null | sort -u)"}); then
        _describe -t schedules 'schedules' schedules
    fi
}

# Dynamic completion for user IDs (for reassign)
_pdctl_user_ids() {
    local -a users
    if users=(${(f)"$(pdctl --json oncall list --limit 50 2>/dev/null | jq -r '.[].user | "\(.id):\(.summary)"' 2>/dev/null | sort -u)"}); then
        _describe -t users 'users' users
    fi
}

"#;
            let completion = completion
                .replace(
                    "':id -- Incident ID:_default'",
                    "':id -- Incident ID:_pdctl_incident_ids'",
                )
                .replace(
                    "'*--service=[Filter by service ID]:SERVICE:_default'",
                    "'*--service=[Filter by service ID]:SERVICE:_pdctl_service_ids'",
                )
                .replace(
                    "':id -- Schedule ID:_default'",
                    "':id -- Schedule ID:_pdctl_schedule_ids'",
                )
                .replace(
                    "'--to=[User ID or escalation policy ID to assign to]:TO:_default'",
                    "'--to=[User ID or escalation policy ID to assign to]:TO:_pdctl_user_ids'",
                );

            let completion =
                completion.replace("_pdctl() {", &format!("{}_pdctl() {{", custom_functions));

            io::stdout().write_all(completion.as_bytes()).unwrap();
        }
        _ => {
            generate(shell, &mut cmd, "pdctl", &mut io::stdout());
        }
    }
}
