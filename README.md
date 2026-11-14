# make.fun btc-cent-forecast-01 entry

Forecast Bitcoin's US-dollar price 240 minutes after each checkpoint,
from the 4,320 one-minute closes up to it.

Model (Node 22, stdlib only, no network at runtime): last close pulled
5% toward the mean of the last 360 closes (6h). At a 4h horizon BTC is
close to a random walk and every trend model scores worse than
persistence; the only family beating persistence in both backtest
windows (486 Coinbase BTC-USD 1m checkpoints) is this small pull:
pooled MAE 41,382 cents vs persistence 41,488. Sealed practice:
44,369 vs baseline 44,522.
