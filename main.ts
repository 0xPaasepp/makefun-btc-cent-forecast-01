// btc-cent-forecast-01 entry (Node 22, standard library only).
//
// Forecast: the close 240 minutes after the checkpoint, from the 4,320
// one-minute closes up to the checkpoint.
//
//   forecast = last + 0.05 * (mean(last 360 closes) - last)
//
// Rationale (backtested on 486 checkpoints of Coinbase BTC-USD 1m closes,
// Sep 15-Nov 10 2026 main window + Aug 15-Sep 15 2026 out-of-sample):
// at a 4h horizon BTC is close to a random walk and every trend model
// (damped extrapolation, EWMA of returns, median 4h drift) scores WORSE
// than persistence. The only family that beats persistence in BOTH windows
// is a small pull toward a short-horizon average: the 6h mean with a 0.05
// weight. Pooled MAE 41,382 cents vs persistence 41,488 (gain +105 cents,
// +0.25%); on the sealed practice it scores 44,369 vs the baseline's
// 44,522. The pull is deliberately tiny: the signal is weak (paired
// t ~ 1.1), so a larger weight just adds variance. The 6h mean also
// averages out the Orca pool's idiosyncratic minute noise, which the
// checkpoint close itself may carry.
//
// Deterministic: pure arithmetic over the case's own prices, no randomness,
// no network, no time dependence. Runs in well under a second per case.
//
// Defensive: a case with a non-finite price is forward-filled, and any
// unreadable or malformed case still gets a valid fallback output, because
// an invalid case costs the entry its prize eligibility while a bad guess
// only costs that case's error.
//
// The kit's starter/main.ts is this program's shape (read every <id>.in in
// name order, write <id>.out as {"forecasts":[{"case":"<id>","price":...}]}):
//   mkdir -p out && MAKEFUN_INPUT_DIR=input MAKEFUN_OUTPUT_DIR=out node main.ts
// (Node prints a harmless "module type not specified" warning for the .ts
// file; the run still exits 0 and writes every case. Verified locally
// 2026-11-15: practice MAE 44,368.838333 cents vs baseline 44,521.576667.)

import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const INPUT_DIR = process.env.MAKEFUN_INPUT_DIR ?? '/input';
const OUTPUT_DIR = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

/** The smallest positive price on the grid: one unit of its 5 decimals. */
const MIN_PRICE = 0.00001;
/** The largest grid price below the scorer's exclusive 10,000,000-dollar cap. */
const MAX_PRICE = 9_999_999.99999;

/** How many of the latest closes the anchor averages (6 hours). */
const ANCHOR_WINDOW = 360;
/** Weight of the pull from the checkpoint close toward the anchor. */
const PULL = 0.05;

/** x kept on the grid's 5 decimals and inside the scorer's (0, 10,000,000). */
const price5 = (x) => Math.round(Math.min(MAX_PRICE, Math.max(MIN_PRICE, x)) * 1e5) / 1e5;

/** Fallback guess if a case carries no usable price at all (never happens on
 *  a real case, but an invalid case costs the entry its prize eligibility,
 *  so the program degrades instead of throwing). */
const FALLBACK_PRICE = 1;

/**
 * A case's closes with any non-finite entry replaced by the last finite
 * close before it (a no-move minute). Returns [] when nothing is usable.
 */
function cleanPrices(prices) {
  const out = [];
  let lastFinite = null;
  for (const p of prices) {
    if (typeof p === 'number' && Number.isFinite(p)) {
      out.push(p);
      lastFinite = p;
    } else if (lastFinite !== null) {
      out.push(lastFinite);
    }
  }
  return out;
}

/** Forecast one market: last close pulled 5% toward its 6-hour mean. */
function forecast(m) {
  if (!Array.isArray(m.prices) || m.prices.length === 0) return FALLBACK_PRICE;
  const x = cleanPrices(m.prices);
  if (x.length === 0) return FALLBACK_PRICE;
  const last = x[x.length - 1];
  const w = Math.min(ANCHOR_WINDOW, x.length);
  let sum = 0;
  for (let i = x.length - w; i < x.length; i++) sum += x[i];
  const anchor = sum / w;
  return price5(last + PULL * (anchor - last));
}

mkdirSync(OUTPUT_DIR, { recursive: true });
// Every case file, in name order, so two runs write the same bytes.
// A case is never left without an output: any unreadable or malformed
// file still gets a (bad but valid) fallback guess, because an invalid
// case costs the entry its prize eligibility while a bad guess only
// costs that case's error.
const inputs = readdirSync(INPUT_DIR).filter((f) => f.endsWith('.in')).sort();
for (const file of inputs) {
  const id = file.slice(0, -'.in'.length);
  let price = FALLBACK_PRICE;
  try {
    const c = JSON.parse(readFileSync(join(INPUT_DIR, file), 'utf8'));
    if (!Array.isArray(c.markets) || c.markets.length !== 1) throw new Error(`${file} does not hold exactly one market`);
    price = forecast(c.markets[0]);
  } catch {
    price = FALLBACK_PRICE;
  }
  writeFileSync(join(OUTPUT_DIR, `${id}.out`), `${JSON.stringify({ forecasts: [{ case: id, price }] })}\n`);
}
