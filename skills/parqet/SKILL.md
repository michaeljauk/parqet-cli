---
name: parqet
version: 1.0.0
description: "Parqet portfolio tracker CLI: fetch portfolio value, holdings, performance, and activities. Use when the user asks about their portfolio, investments, holdings, stock performance, returns, dividends, or Parqet data."
---

# parqet — Portfolio Tracker CLI

## Installation

```bash
npm install -g parqet-cli
parqet auth login  # OAuth browser flow
```

## Auth

```bash
parqet auth status   # check auth — run this first
parqet auth login    # opens browser for OAuth
parqet auth logout   # clear stored token
```

If a command exits with code `2`, authentication is missing or expired. Run `parqet auth login`.

## Exit Codes

| Code | Meaning |
|------|---------|
| `0` | Success |
| `1` | Error |
| `2` | Not authenticated — run `parqet auth login` |

## Portfolio

```bash
# List all portfolios — always use --output json for structured data
parqet portfolio list --output json

# Performance snapshot (default: YTD)
parqet portfolio show <id> --output json
parqet portfolio show <id> --timeframe 1y --output json
parqet portfolio show <id> --timeframe max --output json

# Holdings
parqet portfolio holdings <id> --output json

# Recent activities (transactions)
parqet portfolio activities <id> --output json
parqet portfolio activities <id> --limit 50 --output json
```

## Timeframes

`1d` `1w` `mtd` `1m` `3m` `6m` `1y` `ytd` `3y` `5y` `10y` `max`

## jq Patterns

```bash
# Portfolio value
parqet portfolio show <id> --output json | jq '.performance.valuation.atIntervalEnd'

# YTD return in percent points
parqet portfolio show <id> --output json | jq '.performance.unrealizedGains.inInterval.returnGross'

# Holdings sorted by value
parqet portfolio holdings <id> --output json | jq '[.[] | {name: .asset.name, value: .position.currentValue}] | sort_by(-.value)'

# Portfolio IDs
parqet portfolio list --output json | jq '.[].id'
```

## Output Formats

All commands support `--output table|json|markdown`. Agents should always use `--output json`.

## Environment Variables

| Variable | Description |
|----------|-------------|
| `PARQET_TOKEN` | Override stored access token (for CI) |
| `PARQET_QUIET=1` | Suppress info messages |
| `NO_COLOR=1` | Disable ANSI colors |
| `CI=true` | Non-interactive mode, defaults to JSON output |

## API Notes

- `returnGross` and `returnNet` are in **percent points** (e.g. `-0.96` = `-0.96%`, not `-96%`)
- `gainGross` / `gainNet` are in the portfolio currency
- Holdings come from the performance endpoint, not a separate endpoint
