const ema = require('trading-indicator').ema;
const source = require('trading-indicator').source;
const getOHLCV = require('./ohlcv');
const data = require('./data');
const fs = require('fs');

// val1, val2 is array data, demonstrating an indicator line
// this function verifies if val1 crossover val2
const crossover = (val1, val2) => {
  return (
    val1[val1.length - 2] < val2[val2.length - 2] && val1[val1.length - 1] >= val2[val2.length - 1]
  );
};

// val1, val2 is array data, demonstrating an indicator line
// this function verifies if val1 crossunnder val2

const btcPairs = data
  .filter(
    (item) =>
      item.q === 'BTC' &&
      item.s.indexOf('DOWN') === -1 &&
      item.s.indexOf('UP') === -1 &&
      item.b.indexOf('USD') === -1
  )
  .map((item) => item.s);
const usdtPairs = data
  .filter(
    (item) =>
      item.q === 'USDT' &&
      item.s.indexOf('DOWN') === -1 &&
      item.s.indexOf('UP') === -1 &&
      item.b.indexOf('USD') === -1
  )
  .map((item) => item.s);

const tagMap = {};
data.forEach((item) => {
  tagMap[item.s] = item.tags;
});
const crossunder = (val1, val2) => {
  return (
    val1[val1.length - 2] > val2[val2.length - 2] && val1[val1.length - 1] <= val2[val2.length - 1]
  );
};
let signalPairs = [];
const checkTicker = async (ticker, period1, period2, timeframe) => {
  let temp = [];
  let emaArr1 = [];
  let emaArr2 = [];
  try {
    temp = await getOHLCV('binance', ticker, timeframe);
    emaArr1 = await ema(period1, 'close', 'binance', ticker, timeframe);
    emaArr2 = await ema(period2, 'close', 'binance', ticker, timeframe);
  } catch (err) {
    console.log(err, signalPairs);
  }
  if (!temp) {
    return;
  }
  const ohlcv = temp.reverse();
  let price = [];
  let i = 1; // skip the current candle
  while (i < 4) {
    ohlcv[i] && price.push(ohlcv[i][3]);
    i++;
  }
  const min = Math.min(...price);
  const max = Math.max(...price);
  const currentEmaValue1 = emaArr1.pop();
  const currentEmaValue2 = emaArr2.pop();
  if (min <= currentEmaValue1 && currentEmaValue1 <= max) {
    const signal = {
      ticker,
      period1,
      timeframe,
      currentPrice: price[0],
      currentEmaValue1,
      tags: tagMap[ticker]
    };
    signalPairs.push(signal);
    console.log(`=========EMA ${ticker} in range \n`, signal);
  }

  if (min <= currentEmaValue2 && currentEmaValue2 <= max) {
    const signal = {
      ticker,
      period2,
      timeframe,
      currentPrice: price[0],
      currentEmaValue2,
      tags: tagMap[ticker]
    };
    signalPairs.push(signal);
    console.log(`=========EMA ${ticker} in range \n`, signal);
  }
};

(async () => {
  try {
    const tickerSets = usdtPairs;
    const totalLength = tickerSets.length;
    while (tickerSets.length > 0) {
      let ticker = tickerSets.pop();
      console.log(`- ${totalLength - tickerSets.length}/${totalLength}`);
      await checkTicker(ticker, 633, 257, '4h');
      await checkTicker(ticker, 89, 257, '1d');
    }
    console.log('Result:', signalPairs);
    // file system module to perform file operations
    const fs = require('fs');
    fs.writeFile('output.json', JSON.stringify(signalPairs), 'utf8', function (err) {
      if (err) {
        console.log('An error occured while writing JSON Object to File.');
        return console.log(err);
      }

      console.log('JSON file has been saved.');
    });
  } catch (e) {
    console.log('Result:', signalPairs);
    console.error(e);
  }
})();
