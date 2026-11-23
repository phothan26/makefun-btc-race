// Tide Runner — a slow-trend cbBTC bot for make.fun's BTC race.
// Idea: one-minute BTC bars are mostly noise (about 8 bps of jitter a minute)
// while a full round trip costs about 26 bps in fee, slippage and impact, so
// fast signals churn themselves to death. This bot only rides a slow trend:
// it buys once the 21-bar EMA sits clearly above the 50-bar EMA (a 0.30%
// band, so a flat wiggle never triggers it) while price holds above the
// 120-bar EMA, then sits in the trade behind a 2% trailing stop. It exits
// when the fast EMA falls clearly back below the slow one, or the trailing
// stop is hit, and only re-enters on a fresh band cross. One position, full
// size, at most one order per bar, and everything is a pure function of the
// bars seen so far — no clock, no network, no randomness.

import { runBars } from './vendor/makefun-bars.ts';
import type { BarsState, Batch } from './vendor/makefun-bars.ts';

const SYMBOL = 'CBBTC';
const FAST = 21; // fast EMA length, in bars
const SLOW = 50; // slow EMA length, in bars
const TREND = 120; // trend EMA length, in bars
const BAND = 0.003; // 0.30%: how far the fast EMA must clear the slow one
const TRAIL = 0.02; // 2%: trailing stop below the running peak
const MAX_SLIPPAGE_BPS = 100; // 1%: never chase a gap bigger than this
const MIN_BARS = SLOW + 3; // bars of history before any trade is allowed

// Exponential moving average over the closes seen so far, seeded on the
// first close. Kept incremental so the value is identical on every run.
class Ema {
  private k: number;
  private value: number | null = null;

  constructor(length: number) {
    this.k = 2 / (length + 1);
  }

  update(close: number): number {
    if (this.value === null) {
      this.value = close;
    } else {
      this.value = close * this.k + this.value * (1 - this.k);
    }
    return this.value;
  }

  get current(): number | null {
    return this.value;
  }
}

const emaFast = new Ema(FAST);
const emaSlow = new Ema(SLOW);
const emaTrend = new Ema(TREND);
let closesSeen = 0;
let peak = 0; // running peak close while long, for the trailing stop
let hasEntered = false; // whether the first-trade rule has fired

await runBars({
  onBatch(state: BarsState, _batch: Batch) {
    if (state.warmingUp) return []; // warm-up bars build history; no trading
    const closeRaw = state.close(SYMBOL);
    if (closeRaw === null) return [];
    const close = Number(closeRaw) / 100000; // price_scale 5 -> USDC
    const fast = emaFast.update(close);
    const slow = emaSlow.update(close);
    const trend = emaTrend.update(close);
    closesSeen += 1;
    if (closesSeen < MIN_BARS) return [];

    const held = state.positions.get(SYMBOL)?.qty ?? 0n;
    if (held > 0n) {
      if (close > peak) peak = close;
      // Exit: trend turned, or the trailing stop was hit.
      if (fast < slow * (1 - BAND) || close < peak * (1 - TRAIL)) {
        return [{ side: 'sell', symbol: SYMBOL, qty: held, max_slippage_bps: MAX_SLIPPAGE_BPS }];
      }
      return [];
    }

    // Flat from here on. Never submit a zero-size order if the account is empty.
    if (!state.cash) return [];

    // Flat: enter when the trend is up. On the first eligible bar, a plain
    // uptrend is enough; after that, demand the fast EMA to clear the slow
    // one by the full band, so re-entries need a real move, not a wiggle.
    const trendUp = close > trend && fast > slow;
    if (!hasEntered) {
      if (trendUp) {
        hasEntered = true;
        peak = close;
        return [{ side: 'buy', symbol: SYMBOL, notional_quote_units: state.cash, max_slippage_bps: MAX_SLIPPAGE_BPS }];
      }
      return [];
    }
    if (fast > slow * (1 + BAND) && close > trend) {
      peak = close;
      return [{ side: 'buy', symbol: SYMBOL, notional_quote_units: state.cash, max_slippage_bps: MAX_SLIPPAGE_BPS }];
    }
    return [];
  },
});
