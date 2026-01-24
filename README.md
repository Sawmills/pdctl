# pdctl

[![CI](https://github.com/sawmills/pdctl/actions/workflows/ci.yml/badge.svg)](https://github.com/sawmills/pdctl/actions/workflows/ci.yml)

`pdctl` is a PagerDuty CLI designed for on-call engineers who need to respond to incidents quickly from their terminal.

## Installation

### Homebrew

```bash
brew install sawmills/tap/pdctl
```

### Manual Installation

Download the latest binary for your platform from the [Releases](https://github.com/sawmills/pdctl/releases) page.

1. Extract the archive.
2. Move the `pdctl` binary to a directory in your `PATH` (e.g., `/usr/local/bin`).

## Configuration

`pdctl` requires a PagerDuty API token to authenticate. You can generate one in your [PagerDuty account settings](https://support.pagerduty.com/docs/api-access-reviews#section-generate-a-user-level-rest-api-key).

Set the `PAGERDUTY_TOKEN` environment variable:

```bash
export PAGERDUTY_TOKEN="your-token-here"
```

## Usage

```bash
pdctl [--json] <command>
```

### Commands

#### Authentication
- `pdctl whoami`: Show current authenticated user.

#### Incidents
- `pdctl incident list`: List incidents.
  - Options: `--status`, `--service`, `--urgency`, `--limit`, `--since`, `--until`.
  - Example: `pdctl incident list --status triggered,acknowledged --urgency high`
  - Example with time range: `pdctl incident list --since 2024-01-01 --until 2024-01-31`
- `pdctl incident view <id>`: View incident details.
- `pdctl incident ack <id>`: Acknowledge an incident.
- `pdctl incident resolve <id>`: Resolve an incident.
- `pdctl incident note <id> -m "message"`: Add a note to an incident.
- `pdctl incident reassign <id> --to <user_id|policy_id>`: Reassign an incident.

#### On-Call & Schedules
- `pdctl oncall list`: List current on-call users.
  - Options: `--schedule`, `--limit`.
- `pdctl schedule list`: List all schedules.
- `pdctl schedule view <id>`: View schedule details.

#### Services
- `pdctl service list`: List services.
  - Options: `--limit`.
- `pdctl service status`: Show service status summary.

#### Users
- `pdctl user list`: List users.
  - Options: `--limit`.

#### Escalation Policies
- `pdctl ep list`: List escalation policies.
  - Options: `--limit`.

### JSON Output

All commands support the `--json` flag for machine-readable output:

```bash
pdctl --json incident list
```

## Shell Completion

Generate shell completions for your preferred shell. The Zsh completions include dynamic completion for IDs (incidents, services, schedules, users, escalation policies) that fetch real data from your PagerDuty account.

### Bash
```bash
pdctl completion bash > /usr/local/etc/bash_completion.d/pdctl
```

### Zsh
```bash
pdctl completion zsh > /usr/local/share/zsh/site-functions/_pdctl
```

### Fish
```bash
pdctl completion fish > ~/.config/fish/completions/pdctl.fish
```

### Dynamic Completions (Zsh)

With Zsh completions installed, you can tab-complete:
- Incident IDs: `pdctl incident view <TAB>` shows recent incidents with titles
- Service IDs: `pdctl incident list --service=<TAB>` shows available services  
- Schedule IDs: `pdctl schedule view <TAB>` or `pdctl oncall list --schedule=<TAB>`
- User/Policy IDs: `pdctl incident reassign <id> --to=<TAB>` shows users and escalation policies

## Raycast Extension

A companion Raycast extension is available for quick incident management from your menu bar.

### Features

- **List Incidents**: Search and filter incidents by status, urgency, and service
- **Quick Actions**: Acknowledge, resolve, add notes, and reassign incidents
- **On-Call Status**: View current on-call schedules
- **Menu Bar Widget**: See active incident count at a glance with quick actions

### Installation

The Raycast extension is included in the `raycast-pdctl/` directory.

```bash
cd raycast-pdctl
npm install
npm run dev
```

This registers the extension with Raycast. You'll be prompted to configure your PagerDuty subdomain on first use.

### Configuration

The extension uses the same `PAGERDUTY_TOKEN` environment variable as the CLI. Make sure it's set in your shell profile so Raycast can access it.
