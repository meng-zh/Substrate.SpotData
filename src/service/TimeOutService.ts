import { WsClient } from './WsClient';
//检测超时
export async function RunCheckTimeOut(clients: Map<string, WsClient>) {
    while (true) {
        clients.forEach((c, id) => {
            if (c.IsTimeOut()) {
                console.log('be closed :%s', id);
                c.BeClose();
                clients.delete(id);
            }
        });
        await sleep(1000);
    }
}
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
