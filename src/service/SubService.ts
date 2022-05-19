const  { ApiPromise, WsProvider } = require('@polkadot/api');
import config from '../config/common.json';
import types from'../config/Types.json';
import { SubClient } from './SubClient';

export class SubService {
    public api;
    _clients;
    _WhenDataChange;
    constructor(whenDataChange) {
        this.api = null;
        //客户端 （id,SubClient)
        this._clients = new Map();
        this._WhenDataChange = whenDataChange;
    }
    ///链接初始化
    async  _init() {
        this.api = await ApiPromise.create({
            provider: new WsProvider(config.BlockChainNode),
            types
        });
        const [chain] = await Promise.all([
            this.api.rpc.system.chain(),
        ]);
        console.log(`connected to chain ${chain} on ${config.BlockChainNode}`);
    }

    public async Run(){
        await this._init();
        config.Matches.forEach( async config =>  {
            console.log('listen to Pair => ' + config.Pair);
            this._clients.set(config.MatchIndex, new SubClient(this.api, config, this._WhenDataChange));
            await this._clients.get(config.MatchIndex).SubscribeOrder();
            await this._clients.get(config.MatchIndex).SubscribeCancel();
        });
    }

    public GetOrder(direct :string, index:number) {
        const client = this._clients.get(index);
        if (client != null) {
            if (direct == 'Buy')
                return client._buyOrders;
            else if (direct == 'Sell')
                return client._sellOrders;
        } else {
            return null;
        }
    }

}