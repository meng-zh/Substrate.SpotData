

import { WebSocket } from 'ws';
import { v4 as uuidv4 } from 'uuid';
import { WsClient } from './WsClient';
var log = require('npmlog')

export function CreateServer(port): WebSocket.WebSocketServer {
    return new WebSocket.Server({ port: port });
}


export function connected(ws: WebSocket, clients: Map<string, WsClient>, pairIndexs: Map<string, number>, GetCurrentData) {
    try {
        const id = uuidv4().toLowerCase();
        const total = clients.size;
        console.log('connected %s , new connecting :%s', total, id);
        clients.set(id, new WsClient(ws, pairIndexs, GetCurrentData));

        ws.on('message', function message(data) {
            clients.get(id).ReceivedMsg(data);
        });

        //检查到关闭
        ws.on('close', function colse() {
            clients.delete(id);
        });

    }
    catch (err) {
        log.error('ws service','connected failed :%s', err.message);
    }
}