'use strict';
const AWS = require('aws-sdk');
let http = require('http');
let https = require('https');
AWS.config.setPromisesDependency(require('bluebird'));
const dynamoDb = new AWS.DynamoDB.DocumentClient({
  region: "us-east-1",

  accessKeyId: "AKIAJZQSSMCC5MEWMP6Q",
  secretAccessKey: "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"
});

// Insert Data into DynanmoDB table(QuadrigaCX) every 20 Sec
function onRequest(request, response) {

  clearInterval(requestLoop);
  var requestLoop = setInterval(function () {
    var url1 = 'https://api.quadrigacx.com/v2/ticker?book=btc_cad';
    SaveData(url1, 'btc_cad');
    // var url2 = 'https://api.quadrigacx.com/v2/ticker?book=btc_usd';
    // SaveData(url2, 'btc_usd');
    // var url3 = 'https://api.quadrigacx.com/v2/ticker?book=eth_btc';
    // SaveData(url3, 'eth_btc');
    // var url4 = 'https://api.quadrigacx.com/v2/ticker?book=eth_cad';
    // SaveData(url4, 'eth_cad');
    // var url5 = 'https://api.quadrigacx.com/v2/ticker?book=ltc_cad';
    // SaveData(url5, 'ltc_cad');
    // var url6 = 'https://api.quadrigacx.com/v2/ticker?book=bch_cad';
    // SaveData(url6, 'bch_cad');
    console.log('query values save');
    //response.end();
  }, 20000);
}
// Save Data Function
function SaveData(url, pair) {
  https.get(url, (res) => {
    console.log('url:', url);
    console.log('statusCode:', res.statusCode);
    // Submit Data
    res.on('data', (d) => {
      var t = JSON.parse(d);
      submitTradingInfo(tradingInfo(pair, t.last, t.timestamp));
      GetMinMax(pair, t.timestamp, t.last);
      return true;
    }).on('error', (e) => {
      console.error(e);
      return false;
    })
  });
}

const tradingInfo = (t_pair, t_last, t_timestamp) => {
  console.log('tradingInfo trading');
  return {
    Pair: t_pair,
    TradeValue: +t_last,
    APITimeStamp: +t_timestamp,
  };
};

const submitTradingInfo = trading => {
  console.log('Submitting trading');
  const tradingInfo = {
    TableName: 'dataTable_test',
    Item: trading,
  };
  return dynamoDb.put(tradingInfo).promise().then(res => trading);
};

var min = new Array();
min['ltc_cad'] = 99999;
min['btc_cad'] = 99999;
min['btc_usd'] = 99999;
min['eth_btc'] = 99999;
min['eth_cad'] = 99999;
min['bch_cad'] = 99999;

var max = new Array();
max['ltc_cad'] = 0;
max['btc_cad'] = 0;
max['btc_usd'] = 0;
max['eth_btc'] = 0;
max['eth_cad'] = 0;
max['bch_cad'] = 0;

var interval_size = 3;
var last_min_rem = new Array();
last_min_rem['ltc_cad'] = interval_size - 1;
last_min_rem['btc_cad'] = interval_size - 1;
last_min_rem['btc_usd'] = interval_size - 1;
last_min_rem['eth_btc'] = interval_size - 1;
last_min_rem['eth_cad'] = interval_size - 1;
last_min_rem['bch_cad'] = interval_size - 1;

function GetMinMax(pair, timestamp, tradevalue) {
  var date = new Date(timestamp * 1000);
  var minutes = date.getMinutes();
  var secs = date.getSeconds();

  if (minutes % interval_size == 0 && last_min_rem[pair] == interval_size - 1) {
    last_min_rem[pair] = minutes % interval_size;
    var end = date.setSeconds(0);
    var start = end - interval_size * 60000;
    //Insert into DB
    submitMinMax(MinMax(pair, start, end, min[pair], max[pair]));
    //Set new value for min max
    min[pair] = tradevalue, max[pair] = tradevalue;
  }
  else {
    last_min_rem[pair] = minutes % interval_size;
    if (tradevalue > max[pair]) max[pair] = tradevalue;
    if (tradevalue < min[pair]) min[pair] = tradevalue;
  }
}

const MinMax = (t_pair, t_start_timestamp, t_end_timestamp, t_min, t_max) => {
  console.log('trading min max');
  return {
    Pair: t_pair,
    StartTime: +t_start_timestamp,
    EndTime: +t_end_timestamp,
    Min: +t_min,
    Max: +t_max,
  };
};

const submitMinMax = minmax => {
  console.log('Submitting min max');
  const minmaxInfo = {
    TableName: 'QuadrigaCXMinMax',
    Item: minmax,
  };
  return dynamoDb.put(minmaxInfo).promise().then(res => minmax);
};

http.createServer(onRequest).listen(8080);
console.log("The server is running at 8080");