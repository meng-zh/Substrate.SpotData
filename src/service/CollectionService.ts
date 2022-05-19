import config from '../config/common.json';
import { Connection } from '../service/MysqlService';
const bluebird = require('bluebird');

import { BlockHeight, MatchTx, MatchResultTx, MatchCancelTx,
     QueryMatchTx, CancelMatchTx,GetMaxHeight, GetMinHeight,DeleteHeight} from '../models/DBModel';

export class CollectionServer {
    connection = null;
    api = null;
    //数据库中最高的
    max:number;
    //数据库中最低的
    min:number;
    //当前最新高度
    current:number;
    constructor(api) {
        this.api = api;
    }

    async Run() {
        this.connection = await Connection();
        var query = bluebird.promisify(this.connection.query, {
            context: this.connection
        });
        this.max = await GetMaxHeight(query);
        this.min = await GetMinHeight(query);
        console.log('start from db max ' + this.max );
        console.log('start from db min ' + this.min );
        await this._blockUpdate(this.api);
        await this._retry(this.api);
    }

    async _blockUpdate(api) {
        await api.query.system.number(async (c) => {
            var number = c.toNumber();
            this.current = number;
            console.log('current update ' + number);
            var height = new BlockHeight(number);
            var query = bluebird.promisify(this.connection.query, {
                context: this.connection
            });
            await height.save(query);
            await listenByBlock(api, number, query);
        });
    }

    async _retry(api){
        var query = bluebird.promisify(this.connection.query, {
            context: this.connection
        });
       await retryHeight(api,query,this.min,this.max);
        while(true){
            this.max = await GetMaxHeight(query);
            this.min = await GetMinHeight(query);
            await retryHeight(api,query,this.min,this.max);
            await sleep(30000);
        }
    }
}

async function retryHeight(api,query,min,max){
    for (var i = min; i < max - 1;i++){
        console.log('retry in ' + i);
        await listenByBlock(api, i, query);
        await DeleteHeight(query,i);
        await sleep(100);
    }
}
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
//TODO 保存数据库，每次从最新高度开始，往之前的高度
//二次校验服务
async function listenByBlock(api, number, query) {
    try {
        const hash = await api.rpc.chain.getBlockHash(number);
        var [block, records] = await Promise.all([
            api.rpc.chain.getBlock(hash),
            api.query.system.events.at(hash)
        ]);
        var ts = 0; //时间戳
        var timeExt = block.block.extrinsics.find(f => f.method.section == 'timestamp' && f.method.method == 'set');
        if (timeExt != null) {
            ts = timeExt.method.args.toString();
        }
        //console.log('time ' + ts);
        block.block.extrinsics.forEach((e, index) => {
            var txid = e.hash.toHex();
            var signer = e.isSigned ? e.signer.value.toHuman() : '';
            var events = records.filter((record) => record.phase.isApplyExtrinsic && record.phase.asApplyExtrinsic.eq(index));
            events.forEach(async ev => {
                if (ev.event.method == config.CreateBuyEventMethod && ev.event.section == config.MatchEventSection) {
                    var buy = new MatchTx().CreateTx(number, txid, ts, ev.event.data, 'Buy', signer);
                    await buy.Save(query);
                } else if (ev.event.method == config.CreateSellEventMethod && ev.event.section == config.MatchEventSection) {
                    var sell = new MatchTx().CreateTx(number, txid, ts, ev.event.data, 'Sell', signer);
                    await sell.Save(query);
                }
            });
        });

        records.forEach(async ev => {
            if (ev.event.method == config.MatchResultEventMethod && ev.event.section == config.MatchEventSection) {
                var resultTx = new MatchResultTx(number, ts, ev.event.data);
                var buyOrder = await QueryMatchTx(query, resultTx.BuyId);
                if (buyOrder != null) {
                    buyOrder.WhenMatch(resultTx);
                    buyOrder.UpdateWhenMatch(query);
                }
                var sellOrder = await QueryMatchTx(query, resultTx.SellId);
                if (sellOrder != null) {
                    sellOrder.WhenMatch(resultTx);
                    sellOrder.UpdateWhenMatch(query);
                }
                resultTx.Save(query);

            } else if (ev.event.method == config.CancelEventMethod && ev.event.section == config.MatchEventSection) {
                var cancelTx = new MatchCancelTx(number,ts, ev.event.data);
                await CancelMatchTx(query, cancelTx.OrderId);
                cancelTx.Save(query);
            }
        });
    }
    catch (err) {
        console.error(err);
    }
}