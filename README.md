# pdctl

[![CI](https://github.com/amir-jakoby/pd/actions/workflows/ci.yml/badge.svg)](https://github.com/amir-jakoby/pd/actions/workflows/ci.yml)

`pdctl` is a PagerDuty CLI designed for on-call engineers who need to respond to incidents quickly from their terminal.

## Installation

### Homebrew

```bash
brew install amir-jakoby/tap/pdctl
```

### Manual Installation

Download the latest binary for your platform from the [Releases](https://github.com/amir-jakoby/pd/releases) page.

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
  - Options: `--status`, `--service`, `--urgency`, `--limit`.
  - Example: `pdctl incident list --status triggered,acknowledged --urgency high`
- `pdctl incident view <id>`: View incident details.
- `pdctl incident ack <id>`: Acknowledge an incident.
- `pdctl incident resolve <id>`: Resolve an incident.
- `pdctl incident note <id> -m "message"`: Add a note to an incident.
- `pdctl incident reassign <id> --to <user_id|policy_id>`: Reassign an incident.

#### On-Call & Schedules
- `pdctl oncall list`: List current on-call users.
  - Options: `--schedule`, `--limit`.
- `pdctl schedule view <id>`: View schedule details.

#### Services
- `pdctl service list`: List services.
  - Options: `--limit`.
- `pdctl service status`: Show service status summary.

### JSON Output

All commands support the `--json` flag for machine-readable output:

```bash
pdctl --json incident list
```

## Shell Completion

Generate shell completions for your preferred shell:

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
