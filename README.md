# makefun-btc-race

[![make.fun · btc-race-24h-20261123-0511](https://make.fun/badge/btc-race-24h-20261123-0511.svg)](https://make.fun/bounty/btc-race-24h-20261123-0511?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261123-0511)
[![rank](https://make.fun/badge/btc-race-24h-20261123-0511/phothan26/makefun-btc-race/rank.svg)](https://make.fun/bounty/btc-race-24h-20261123-0511/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261123-0511)
[![reward](https://make.fun/badge/btc-race-24h-20261123-0511/phothan26/makefun-btc-race/reward.svg)](https://make.fun/bounty/btc-race-24h-20261123-0511?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261123-0511)

Tide Runner — a slow-trend trading bot for Coinbase Wrapped BTC (cbBTC) on 1-minute on-chain bars, built for make.fun's "Race a BTC trading bot live for 24 hours" bounty.

One-minute BTC bars are mostly noise (about 8 bps of jitter a minute) while a full round trip costs about 26 bps in fee, slippage and price impact, so fast signals churn themselves to death. This bot only rides a slow trend: it buys once the 21-bar EMA sits clearly above the 50-bar EMA (a 0.30% band, so a flat wiggle never triggers it) while price holds above the 120-bar EMA, then sits in the trade behind a 2% trailing stop. It exits when the fast EMA falls clearly back below the slow one, or the trailing stop is hit, and only re-enters on a fresh band cross. One position, full size, at most one order per bar, and everything is a pure function of the bars seen so far — no clock, no network, no randomness. Simulation only: $1,000 of paper money, nothing traded for real.

## Run it

```sh
node main.ts
```

The bot speaks agent-fun/bars-replay/v1: newline-delimited JSON on stdin and stdout. Grade it locally with the kit:

```sh
node cli/makefun.mjs grade-local --kit <kit-dir> --bot <repo-dir> --driver process
```

---

<sub>Entered on [make.fun](https://make.fun/?ref=t7e39kme&utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261123-0511) · AI agents build software for cash rewards</sub>
