mod client;
mod commands;
mod models;
mod table;

use clap::{Parser, Subcommand};
use clap_complete::Shell;

#[derive(Parser)]
#[command(name = "pdctl")]
#[command(about = "PagerDuty CLI for incident response", version)]
pub struct Cli {
    /// Output as JSON
    #[arg(long, global = true)]
    pub json: bool,

    #[command(subcommand)]
    pub command: Commands,
}

#[derive(Subcommand)]
pub enum Commands {
    /// Show current authenticated user
    Whoami,

    /// Manage incidents
    Incident {
        #[command(subcommand)]
        subcommand: IncidentCommands,
    },

    /// View on-call schedules
    Oncall {
        #[command(subcommand)]
        subcommand: OncallCommands,
    },

    /// View schedule details
    Schedule {
        #[command(subcommand)]
        subcommand: ScheduleCommands,
    },

    /// Manage services
    Service {
        #[command(subcommand)]
        subcommand: ServiceCommands,
    },

    /// Manage users
    User {
        #[command(subcommand)]
        subcommand: UserCommands,
    },

    /// Manage escalation policies
    #[command(name = "ep")]
    EscalationPolicy {
        #[command(subcommand)]
        subcommand: EscalationPolicyCommands,
    },

    /// Generate shell completions
    Completion {
        /// Shell to generate completions for
        #[arg(value_enum)]
        shell: Shell,
    },
}

#[derive(Subcommand)]
pub enum IncidentCommands {
    /// List incidents
    List {
        /// Filter by status
        #[arg(long, value_parser = ["triggered", "acknowledged", "resolved"])]
        status: Option<Vec<String>>,

        /// Filter by service ID
        #[arg(long)]
        service: Option<Vec<String>>,

        /// Filter by urgency
        #[arg(long, value_parser = ["high", "low"])]
        urgency: Option<Vec<String>>,

        /// Maximum number of results
        #[arg(short, long, default_value = "25")]
        limit: u32,
    },

    /// View incident details
    View {
        /// Incident ID
        id: String,
    },

    /// Acknowledge an incident
    Ack {
        /// Incident ID
        id: String,
    },

    /// Resolve an incident
    Resolve {
        /// Incident ID
        id: String,
    },

    /// Add a note to an incident
    Note {
        /// Incident ID
        id: String,

        /// Note message
        #[arg(short, long)]
        message: String,
    },

    /// Reassign an incident
    Reassign {
        /// Incident ID
        id: String,

        /// User ID or escalation policy ID to assign to
        #[arg(long)]
        to: String,
    },
}

#[derive(Subcommand)]
pub enum OncallCommands {
    /// List current on-call users
    List {
        /// Filter by schedule ID
        #[arg(long)]
        schedule: Option<Vec<String>>,

        /// Maximum number of results
        #[arg(short, long, default_value = "25")]
        limit: u32,
    },
}

#[derive(Subcommand)]
pub enum ScheduleCommands {
    /// List schedules
    List {
        #[arg(short, long, default_value = "25")]
        limit: u32,
    },

    /// View schedule details
    View {
        /// Schedule ID
        id: String,
    },
}

#[derive(Subcommand)]
pub enum ServiceCommands {
    /// List services
    List {
        #[arg(short, long, default_value = "25")]
        limit: u32,
    },

    /// Show service status summary
    Status,
}

#[derive(Subcommand)]
pub enum UserCommands {
    /// List users
    List {
        #[arg(short, long, default_value = "25")]
        limit: u32,
    },
}

#[derive(Subcommand)]
pub enum EscalationPolicyCommands {
    /// List escalation policies
    List {
        #[arg(short, long, default_value = "25")]
        limit: u32,
    },
}

#[tokio::main]
async fn main() {
    let cli = Cli::parse();

    let result = match cli.command {
        Commands::Whoami => commands::whoami::run(cli.json).await,
        Commands::Incident { subcommand } => match subcommand {
            IncidentCommands::List {
                status,
                service,
                urgency,
                limit,
            } => commands::incident::list(cli.json, status, service, urgency, limit).await,
            IncidentCommands::View { id } => commands::incident::view(cli.json, &id).await,
            IncidentCommands::Ack { id } => commands::incident::ack(cli.json, &id).await,
            IncidentCommands::Resolve { id } => commands::incident::resolve(cli.json, &id).await,
            IncidentCommands::Note { id, message } => {
                commands::incident::note(cli.json, &id, &message).await
            }
            IncidentCommands::Reassign { id, to } => {
                commands::incident::reassign(cli.json, &id, &to).await
            }
        },
        Commands::Oncall { subcommand } => match subcommand {
            OncallCommands::List { schedule, limit } => {
                commands::oncall::list(cli.json, schedule, limit).await
            }
        },
        Commands::Schedule { subcommand } => match subcommand {
            ScheduleCommands::List { limit } => commands::schedule::list(cli.json, limit).await,
            ScheduleCommands::View { id } => commands::schedule::view(cli.json, &id).await,
        },
        Commands::Service { subcommand } => match subcommand {
            ServiceCommands::List { limit } => commands::service::list(cli.json, limit).await,
            ServiceCommands::Status => commands::service::status(cli.json).await,
        },
        Commands::User { subcommand } => match subcommand {
            UserCommands::List { limit } => commands::user::list(cli.json, limit).await,
        },
        Commands::EscalationPolicy { subcommand } => match subcommand {
            EscalationPolicyCommands::List { limit } => {
                commands::escalation_policy::list(cli.json, limit).await
            }
        },
        Commands::Completion { shell } => {
            commands::completion::run(shell);
            Ok(())
        }
    };

    if let Err(e) = result {
        eprintln!("Error: {}", e);
        std::process::exit(2);
    }
}
