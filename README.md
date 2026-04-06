# parqet-cli

CLI for the [Parqet](https://parqet.com) portfolio tracker. Fetch holdings, performance, and activities from the command line or from agents.

## Installation

```sh
npm install -g parqet-cli
```

After install, authenticate once:

```sh
parqet auth login   # opens browser for OAuth
```

## Authentication

```sh
parqet auth login    # open browser for OAuth authorization
parqet auth status   # check token status
parqet auth logout   # remove stored credentials
```

Tokens are stored at `~/.config/parqet-cli/tokens.json` (mode 600).

If a command exits with code `2`, authentication is missing or expired — run `parqet auth login`.

## Commands

```sh
# List portfolios
parqet portfolio list

# Show portfolio performance (default: YTD)
parqet portfolio show <id>
parqet portfolio show <id> --timeframe 1y
parqet portfolio show <id> --timeframe max

# List holdings
parqet portfolio holdings <id>

# List recent activities (transactions)
parqet portfolio activities <id>
parqet portfolio activities <id> --limit 50
```

### Timeframes

`1d` `1w` `mtd` `1m` `3m` `6m` `1y` `ytd` `3y` `5y` `10y` `max`

## Output formats

Every command supports `--output table|json|markdown`:

```sh
parqet portfolio list --output json
parqet portfolio holdings <id> --output markdown >> holdings.md
```

In CI environments (`CI=true`), JSON output is the default.

## Agent / scripting use

Exit codes:

| Code | Meaning |
|------|---------|
| `0` | Success |
| `1` | Error |
| `2` | Not authenticated — run `parqet auth login` |

Environment variables:

| Variable | Description |
|----------|-------------|
| `PARQET_TOKEN` | Override stored access token (for CI) |
| `PARQET_QUIET=1` | Suppress info messages |
| `NO_COLOR=1` | Disable ANSI colors |
| `CI=true` | Non-interactive mode, defaults to JSON output |

### jq patterns

```sh
# Portfolio value
parqet portfolio show <id> --output json | jq '.performance.valuation.atIntervalEnd'

# YTD return (percent points — e.g. -0.96 means -0.96%)
parqet portfolio show <id> --output json | jq '.performance.unrealizedGains.inInterval.returnGross'

# Holdings sorted by value
parqet portfolio holdings <id> --output json | jq '[.[] | {name: .asset.name, value: .position.currentValue}] | sort_by(-.value)'
```

### Claude Code skill

The skill auto-installs to `~/.claude/skills/parqet/` on `npm install`. After installation it is available as `/parqet` in Claude Code.

## Development

```sh
bun install
bun run generate    # regenerate types from OpenAPI spec
bun run typecheck
bun test
bun run build
```

## License

MIT
