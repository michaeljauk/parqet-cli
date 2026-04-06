# parqet-cli

CLI for [Parqet](https://parqet.com) portfolio tracker. Fetch your holdings, performance, and sync snapshots to your local vault.

## Installation

```sh
# Run directly with bun
bun run src/index.ts

# Or install globally
bun install && bun link
```

## Authentication

```sh
parqet auth login    # Opens browser for OAuth authorization
parqet auth status   # Check token status
parqet auth logout   # Remove stored credentials
```

Tokens are stored at `~/.config/parqet-cli/tokens.json` (mode 600).

## Commands

```sh
# List portfolios
parqet portfolio list

# Show portfolio performance (default: YTD)
parqet portfolio show <id>
parqet portfolio show <id> --timeframe 1y

# List holdings
parqet portfolio holdings <id>

# Sync snapshot to brain repo
parqet sync
parqet sync --portfolio <id> --timeframe ytd --dry-run
```

## Output formats

Every command supports `--output table|json|markdown`:

```sh
parqet portfolio list --output json | jq '.[].name'
parqet portfolio holdings <id> --output markdown >> report.md
```

In CI environments (`CI=true`), JSON output is used by default.

## Agent / scripting use

Exit codes:
- `0` — success
- `1` — error
- `2` — not authenticated (run `parqet auth login`)

Environment variables:
- `PARQET_CLIENT_ID` — override default OAuth client ID
- `PARQET_QUIET=1` — suppress info messages
- `NO_COLOR=1` — disable ANSI colors
- `CI=true` — non-interactive mode, JSON output by default

## Brain repo integration

`parqet sync` writes a Markdown snapshot to `~/brain/projects/parqet/snapshots/YYYY-MM-DD.md`.

Set up a daily cron:

```sh
0 8 * * * cd ~/brain && parqet sync --timeframe ytd >> /tmp/parqet-sync.log 2>&1
```

## Development

```sh
pnpm install
bun run typecheck
bun run dev -- --help
```

## License

MIT
