// btc-cent-forecast-01 — BTC mean-reversion forecaster.
// Plain JavaScript (no TypeScript annotations), Node 22 stdlib only.
// Model: forecast = last close + 0.05 * (mean of last 360 closes - last close).
// The forecast is rounded to the 5-decimal grid and clamped to (0, 10000000).
// Deterministic, no network, no randomness.
//
// Usage: MAKEFUN_INPUT_DIR=<dir of <id>.in files> MAKEFUN_OUTPUT_DIR=<dir>
//        node main.ts
// For every <id>.in in the input dir (name order) it writes <id>.out:
//   {"forecasts":[{"case":"<id>","price":<number>}]}
// plus a trailing newline. A case that cannot be parsed still gets a
// valid fallback forecast of 1, so the program never throws on bad input.

const fs = require("fs");
const path = require("path");

const INPUT_DIR = process.env.MAKEFUN_INPUT_DIR || "input";
const OUTPUT_DIR = process.env.MAKEFUN_OUTPUT_DIR || "output";

const FALLBACK_PRICE = 1;
const MAX_PRICE = 10000000;
const ANCHOR_WINDOW = 360;
const PULL = 0.05;
const GRID = 100000; // 5-decimal grid

// Replace non-finite entries by carrying the last finite price forward.
// Leading non-finite entries are dropped; an empty result means no
// usable price at all.
function cleanPrices(raw) {
  const cleaned = [];
  let lastGood = null;
  for (const value of raw || []) {
    const price = Number(value);
    if (Number.isFinite(price)) {
      lastGood = price;
      cleaned.push(price);
    } else if (lastGood !== null) {
      cleaned.push(lastGood);
    }
  }
  return cleaned;
}

// Mean of the last n entries of a price series, summed forward from
// the window start so the result is identical to slicing then summing.
function meanOfTail(prices, n) {
  const start = Math.max(0, prices.length - n);
  let sum = 0;
  for (let i = start; i < prices.length; i++) {
    sum += prices[i];
  }
  return sum / (prices.length - start);
}

// Mean-reversion forecast for one cleaned price series.
function forecastPrice(prices) {
  if (!prices || prices.length === 0) {
    return FALLBACK_PRICE;
  }
  const last = prices[prices.length - 1];
  if (!Number.isFinite(last)) {
    return FALLBACK_PRICE;
  }
  const anchor = meanOfTail(prices, ANCHOR_WINDOW);
  let forecast = last + PULL * (anchor - last);
  forecast = Math.round(forecast * GRID) / GRID;
  if (!Number.isFinite(forecast) || forecast <= 0) {
    return FALLBACK_PRICE;
  }
  if (forecast >= MAX_PRICE) {
    return MAX_PRICE - 1 / GRID;
  }
  return forecast;
}

// One forecast per case file; exactly one market per case.
function forecastCase(data) {
  if (!data || typeof data !== "object") {
    return FALLBACK_PRICE;
  }
  const markets = data.markets;
  if (!Array.isArray(markets) || markets.length === 0) {
    return FALLBACK_PRICE;
  }
  const market = markets[0];
  if (!market || typeof market !== "object") {
    return FALLBACK_PRICE;
  }
  const prices = cleanPrices(market.prices);
  return forecastPrice(prices);
}

function main() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  const names = fs
    .readdirSync(INPUT_DIR)
    .filter((name) => name.endsWith(".in"))
    .sort();
  for (const name of names) {
    const caseId = name.slice(0, -".in".length);
    let price = FALLBACK_PRICE;
    try {
      const data = JSON.parse(
        fs.readFileSync(path.join(INPUT_DIR, name), "utf8")
      );
      price = forecastCase(data);
    } catch (err) {
      price = FALLBACK_PRICE;
    }
    const out = {
      forecasts: [{ case: caseId, price: price }],
    };
    fs.writeFileSync(
      path.join(OUTPUT_DIR, caseId + ".out"),
      JSON.stringify(out) + "\n",
      "utf8"
    );
  }
}

main();
