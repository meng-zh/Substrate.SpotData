
import express from 'express';
import { WebSocket } from 'ws';
import { connected } from './service/WsService';
import { WsClient } from './service/WsClient';
import { RunCheckTimeOut } from './service/TimeOutService';
import { SubService } from './service/SubService';
import commonConfig from './config/common.json';
import {CollectionServer} from './service/CollectionService';
var log = require('npmlog')
const app = express();
const port = 3000;

///websocket 服务端
const wsServer = new WebSocket.Server({ port: commonConfig.SocketPort });
///substrate 服务端
const subServer = new SubService(whenDataChange);


//获取币对配置
function GetPairConfig():Map<string,number>{
  var pairs= new Map();
  commonConfig.Matches.forEach(value => {
      pairs.set(value.Pair, value.MatchIndex);
  });
  return pairs;
}

///map (币对名，index)
const pairIndexs = GetPairConfig();

///websocket客户端
var clients = new Map<string, WsClient>();

app.get('/', (req, res) => {
  res.send('Hello World!');
});

app.listen(port, () => {
  return console.log(`Express is listening at http://localhost:${port}`);
});

const run = async () => {
  log.info('Start programe.....');
  wsServer.on('connection', (ws: WebSocket) => {
    connected(ws, clients,pairIndexs,GetCurrentData)
  });
  await subServer.Run();
  var collect = new CollectionServer(subServer.api);
  await collect.Run();
  await RunCheckTimeOut(clients);
}

///当数据变化时
function whenDataChange(direct, pair, datas) {
  clients.forEach((c, _id) => {
    c.WhenDataChanged(direct, pair, datas);
  });
}

///获取当前的订单数据
function GetCurrentData(direct, pairName) {
  return subServer.GetOrder(direct, pairIndexs.get(pairName));
}

run();