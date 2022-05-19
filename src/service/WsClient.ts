import { SubChannel, SubPrice ,SubMathDeep,SubOrder} from '../models/SubChannel';
import commonConfig from '../config/common.json';
import { GetAllDeepData,OrderResponse,ToDeepData,DeepResponse } from '../models/SubResponse';

export class WsClient {
    _lastPongTime:Date;
    _client:WebSocket;
    //币对配置(币对名，index)
    _pairs;
    //订阅的深度信息
    _deeps :Array<SubMathDeep>;
    //订阅的价格信息
    _prices:Array<SubPrice>;
    //订阅的用户订单信息
    _userOrders:Array<SubOrder>;
    ///获取当前数据的回调
    GetCurrentData;

    constructor(ws:WebSocket,pairs,getCurrentData) {
        this._lastPongTime = new Date();
        this._client = ws;
        this._pairs = pairs;
        this._deeps = [];
        this.GetCurrentData = getCurrentData;
        this._prices = [];
        this._userOrders = [];
    }
    
    public ReceivedMsg(data) {
        if (data == 'ping') {
            this._client.send('pong');
            this._lastPongTime = new Date();
        } else {
            const msg = new SubChannel(data);
            if (msg.Operater == 'sub') {
                switch (msg.Event) {
                    case 'deep': {
                        this._subDeep(msg);break;
                    } case 'price': {
                        this._subPrice(msg);break;
                    } case 'order': {
                        this._subOrder(msg);break;
                    }
                }
            } else if (msg.Operater == 'unsub') {
                switch (msg.Event) {
                    case 'deep': {
                        this._unSubDeep(msg);break;
                    } case 'price': {
                        this._unSubPrice(msg);break;
                    } case 'order': {
                        this._unSubOrder(msg);break;
                    }
                }
            }
        }
    }

    ///是否超时
    public IsTimeOut() {
        const now = new Date();
        const interval :number = commonConfig.PongIntervalSeconds;
        const time = now.getTime() - this._lastPongTime.getTime();
        return (time/1000 > interval);
    }

    public BeClose() {
        this._client.close();
    }

    //订阅深度
    _subDeep(msg) {
        let deep = msg.GetMathDeep();
        if (deep != null && deep.Deep > 0 && deep.Deep <= 8 && this._pairs.has(deep.PairName)) {
            deep.SetMatchIndex(this._pairs.get(deep.PairName));
            if (!this._deeps.some(item => item.Deep == deep.Deep && item.PairName == deep.PairName)) {
                this._deeps.push(deep);

                const sellOrder = this.GetCurrentData('Sell', deep.PairName);
                this.SendDeepData('Sell', sellOrder, deep);
                const buyOrder = this.GetCurrentData('Buy', deep.PairName);
                this.SendDeepData('Buy', buyOrder, deep);
            }
        }
    }
    //取消订阅
    _unSubDeep(msg) {
        const deep = msg.GetMathDeep();
        if (deep != null && this._pairs.has(deep.PairName)) {
            for (let i = 0; i < this._deeps.length; i++) {
                let item = this._deeps.shift();
                if (item.Deep == deep.Deep && item.PairName == deep.PairName) {
                    return;
                } else {
                    this._deeps.push(item);
                }
            }
        }
    }
    _subPrice(msg) {
        let price = msg.GetPrice();
        if (price != null) {
            if (!price.All && this._pairs.has(price.PairName)) {
                price.SetMatchIndex(this._pairs.get(price.PairName));
                if (!this._prices.some(item => item.PairName == price.PairName)) {
                    this._prices.push(price);

                }
            } else {
                this._pairs.forEach(p => {
                    if (!this._prices.some(item => item.PairName == p.PairName)) {
                        let s = new SubPrice(p.PairName);
                        s.SetMatchIndex(this._pairs.get(s.PairName));
                        this._prices.push(s);
                    }
                });
            }
        }
    }
    _unSubPrice(msg) {
        const price = msg.GetPrice();
        if (price != null) {
            if (!price.All && this._pairs.has(price.PairName)) {
                for (let i = 0; i < this._prices.length; i++) {
                    let item = this._prices.shift();//�ƿ���һ��
                    if (item.PairName == price.PairName) {
                        return;
                    } else {
                        this._prices.push(item);//��һ��
                    }
                }
            } else {
                this._prices = [];
            }
        }
    }
    _subOrder(msg) {
        let order = msg.GetUserOrder();
        if (order != null && this._pairs.has(order.PairName)) {
            order.SetMatchIndex(this._pairs.get(order.PairName));
            if (!this._userOrders.some(item => item.PairName == order.PairName && item.User == order.User)) {
                this._userOrders.push(order);
                const sellOrder = this.GetCurrentData('Sell', order.PairName);
                this.SendOrderData('Sell', sellOrder, order);
                const buyOrder = this.GetCurrentData('Buy', order.PairName);
                this.SendOrderData('Buy', buyOrder, order);
            }
        }
    }
    _unSubOrder(msg) {
        const order = msg.GetUserOrder();
        if (order != null && this._pairs.has(order.PairName)) {
            for (let i = 0; i < this._userOrders.length; i++) {
                let item = this._userOrders.shift();
                if (item.PairName == order.PairName && item.User == order.User) {
                    return;
                } else {
                    this._userOrders.push(item);
                }
            }
        }
    }

    ///发送深度数据
    SendDeepData(direct:string,datas,deep:SubMathDeep) {
        if (datas == null) return;
        const data = ToDeepData(datas, deep.Deep, deep.PairName, direct);
        this._sendDeepData(data,direct,deep.Len);
    }
    SendOrderData(direct,datas, subOrder:SubOrder) {
        if (datas == null) return;
        const data = datas.filter(f => f.User == subOrder.User);
        if (data != null && data.length > 0) {
            const sendData = new OrderResponse(subOrder.User,direct, subOrder.PairName, data );
            this._client.send(sendData.ToJsonString());
        }
    }
    ///订单数据更改
    WhenDataChanged(direct, pair, datas) {
        if (datas == null) return;
        const deepDatas = GetAllDeepData(datas, pair, direct);
        const deeps = this._deeps.filter(f => f.PairName == pair);
        deeps.forEach(dp => {
            const data = deepDatas.find(f => f.Deep == dp.Deep);
            this._sendDeepData(data,direct,dp.Len);
        });
        const users = this._userOrders.filter(f => f.PairName == pair);
        users.forEach(u => {
            const data = datas.filter(f => f.User == u.User);
            if (data != null && data.length > 0) {
                const sendData = new OrderResponse(u.User,direct,pair,data);
                this._client.send(sendData.ToJsonString());
            }
        });
    }
    //排序并截取
    _sendDeepData(data :DeepResponse,direct:string,len:number):void {
        if (data == null) return;
        if(direct == 'Sell'){//价格从低到高
            data.Orders =  data.Orders.sort((a,b)=>a.Price-b.Price).slice(0,len);
            this._client.send(data.ToJsonString());
        }else if(direct == 'Buy'){//价格从高到低
            data.Orders =  data.Orders.sort((a,b)=>b.Price-a.Price).slice(0,len);
            this._client.send(data.ToJsonString());
        }
    }
}
