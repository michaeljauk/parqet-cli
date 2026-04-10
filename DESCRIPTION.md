A command-line interface and AI agent integration for the Parqet portfolio tracker. Query your portfolios, holdings, performance, and transaction history directly from the terminal - or let AI agents like Claude Code do it for you.

**GitHub:** https://github.com/michaeljauk/parqet-cli

## What it does

parqet-cli connects to the official Parqet API via OAuth and gives you read access to your portfolio data in three output formats (table, JSON, markdown). It is built for two audiences: humans who prefer the terminal, and AI agents that need structured portfolio data.

## Core capabilities

**Portfolio overview** - List all portfolios with name, currency, and linked brokers. Drill into any portfolio to see current valuation, start-of-period value, unrealized gains (gross and net), time-weighted return (TWR), and more.

**Holdings breakdown** - View every active position in a portfolio sorted by current value. Each holding shows asset name, ISIN, share count, current value, gain/loss, and return percentage. Sold positions are filtered out automatically.

**Transaction history** - Fetch recent activities (buys, sells, dividends, deposits) for any portfolio with configurable limits up to 500 entries.

**Flexible timeframes** - All performance and holdings queries accept a timeframe flag: 1d, 1w, mtd, 1m, 3m, 6m, 1y, ytd, 3y, 5y, 10y, or max.

## Setup

1. Install globally via npm:
   ```
   npm install -g parqet-cli
   ```

2. Authenticate with your Parqet account:
   ```
   parqet auth login
   ```

   This opens your browser for OAuth. Once authorized, tokens are stored locally at `~/.config/parqet-cli/tokens.json`.

3. Verify the connection:
   ```
   parqet portfolio list
   ```

That's it - you're ready to query your portfolios.

For CI/CD environments, set the `PARQET_TOKEN` environment variable instead of using the browser login flow.

## AI agent integration

parqet-cli ships with a bundled Claude Code skill that auto-installs to `~/.claude/skills/parqet/` on `npm install -g`. This lets AI coding agents query portfolio data, generate reports, track performance over time, and integrate financial context into broader workflows - all without manual copy-pasting.
