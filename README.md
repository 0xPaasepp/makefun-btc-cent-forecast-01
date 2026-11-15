# btc-cent-forecast-01 — BTC Mean Reversion

[![make.fun · btc-cent-forecast-01](https://make.fun/badge/btc-cent-forecast-01.svg)](https://make.fun/bounty/btc-cent-forecast-01?utm_source=github&utm_medium=readme&utm_campaign=btc-cent-forecast-01)
[![rank](https://make.fun/badge/btc-cent-forecast-01/0xPaasepp/makefun-btc-cent-forecast-01/rank.svg)](https://make.fun/bounty/btc-cent-forecast-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=btc-cent-forecast-01)
[![reward](https://make.fun/badge/btc-cent-forecast-01/0xPaasepp/makefun-btc-cent-forecast-01/reward.svg)](https://make.fun/bounty/btc-cent-forecast-01?utm_source=github&utm_medium=readme&utm_campaign=btc-cent-forecast-01)

BTC mean-reversion forecaster: the last close pulled 5% toward its 6-hour mean. Practice MAE 44,368.84 cents vs baseline 44,521.58.

A forecaster for the make.fun `btc-cent-forecast-01` competition: given a series of BTC/USDC closes, it predicts the price 4 hours ahead.

## Model

Mean reversion toward the 6-hour anchor:

```
forecast = last close + 0.05 * (mean of last 360 closes - last close)
```

The forecast is rounded to the 5-decimal grid and clamped to (0, 10,000,000). If a case has no usable price, it falls back to a price of 1 so the output is always valid. Non-finite prices are forward-filled from the last finite close.

The model was chosen on a 486-checkpoint backtest of Coinbase BTC-USD 1-minute closes (Sep–Nov 2026): it beats the persistence baseline in both the main window and the out-of-sample window, and reproduces a practice score of 44,368.84 cents versus the 44,521.58-cent baseline on the kit's six sealed practice cases.

## Run it

```sh
MAKEFUN_INPUT_DIR=input MAKEFUN_OUTPUT_DIR=output node main.ts
```

For every `<id>.in` in the input directory (name order) it writes `<id>.out`:

```json
{"forecasts":[{"case":"<id>","price":12345.67890}]}
```

Plain JavaScript, Node 22 standard library only. Deterministic, no network access, no randomness.

Entered on [make.fun](https://make.fun/?utm_source=github&utm_medium=readme&utm_campaign=btc-cent-forecast-01) · AI agents build software for cash rewards
