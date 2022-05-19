
import { MatchOrder } from '../models/MatchOrder';
const { BN } = require('@polkadot/util');

export class SubClient {
    _buyPrices:Array<number>;
    _sellPrices:Array<number>;
    _buyOrderIds;
    _buyCancelIds;
    _buyOrders:Array<MatchOrder>;
    _sellOrders:Array<MatchOrder>;
    _sellOrderIds:Array<string>;
    _SellCancelIds:Array<string>;
    _config;
    _api;
    _currentPrice:number;
    //数据更改的回调
    _WhenDataChange;

    constructor(api, config, whenDataChange) {
        this._buyPrices = [];
        this._sellPrices = [];
        this._buyOrderIds = [];
        this._buyCancelIds = [];
        this._buyOrders = [];
        this._sellOrderIds = [];
        this._sellOrders = [];
        this._SellCancelIds = [];
        this._config = config;
        this._api = api;
        this._currentPrice = 0;
        this._WhenDataChange = whenDataChange;
    }

    ///订单. 价格
    public async SubscribeOrder() {
        ///价格列表
        await this._api.query.spot.buyPrices(this._config.MatchIndex, (data) => {
            data.forEach(async x => {
                const price = x.toNumber();
                const b = new BN(price) / 1000000000000;
                if (!this._buyPrices.some(item => item == b)) {
                    console.log('buy price :' + b);
                    this._buyPrices.push(b);
                    ///订单号列表
                    await this._api.query.spot.buyPriceBuffers(this._config.MatchIndex, price, (orders) => {
                        orders.forEach(async o => {
                            const orderId = o.toHex();
                            if (!this._buyOrderIds.some(item => item == orderId)) {//新的订单
                                this._buyOrderIds.push(orderId);
                                console.log('active buy order ' + o.toHex());
                                ///订单详情
                                await this._api.query.spot.buyOrders(this._config.MatchIndex, orderId, (detail) => {
                                    this._updateOrder("Buy", orderId, detail, this._config.TargetDecimals, this._buyOrders, this._buyOrderIds);
                                    this._WhenDataChange("Buy", this._config.Pair, this._buyOrders);
                                });
                            }

                        });

                    });
                }
            });
        });

        await this._api.query.spot.sellPrices(this._config.MatchIndex, (data) => {
            data.forEach(async x => {
                const price = x.toNumber();
                const b = new BN(price) / 1000000000000;
                if (!this._sellPrices.some(item => item == b)) {
                    console.log('sell price :' + b);
                    this._sellPrices.push(b);
                    ///订单号列表
                    await this._api.query.spot.sellPriceBuffers(this._config.MatchIndex, price, (orders) => {
                        orders.forEach(async o => {
                            const orderId = o.toHex();
                            if (!this._sellOrderIds.some(item => item == orderId)) {//新的订单
                                this._sellOrderIds.push(orderId);
                                console.log('active sell order ' + o.toHex());
                                ///订单详情
                                await this._api.query.spot.sellOrders(this._config.MatchIndex, orderId, (detail) => {
                                    this._updateOrder("Sell", orderId, detail, this._config.TargetDecimals, this._sellOrders, this._sellOrderIds);
                                    this._WhenDataChange("Sell", this._config.Pair, this._sellOrders);
                                });
                            }

                        });
                    });
                }
            });
        });
    }
    ///取消的订单
    public async SubscribeCancel() {
        await this._api.query.spot.cancelBuys(this._config.MatchIndex, (cancelIds) => {
            this._updateCancel(cancelIds, this._buyCancelIds, this._buyOrders);
        });
        await this._api.query.spot.cancelSells(this._config.MatchIndex, (cancelIds) => {
            this._updateCancel(cancelIds, this._SellCancelIds, this._sellOrders);
        });
    }
    ///当前成交价变化
    public async SubPrice() {
        await this._api.query.spot.currentPrice(this._config.MatchIndex, (p) => {
            const price = p.toNumber();
            this._currentPrice = new BN(price) / 1000000000000;
            console.log('Price changed ' + this._currentPrice);
        });
    }

    //更新取消订单
    _updateCancel(newCancelIds, oldCancelIds, orders :Array<MatchOrder>) {
        newCancelIds.forEach(d => {//新的cancel
            console.log("canceling " + d);
            let old = orders.find(o => o.OrderId == d);
            if (old != null) {
                old.WhenCancel(true);
            }

        });
        oldCancelIds.forEach(d => {
            if (!newCancelIds.some(i => i == d)) {//旧的不在新的队列里
                let old = orders.find(o => o.OrderId == d);
                if (old != null) {
                    old.WhenCancel(false);
                }
            }
        });
        oldCancelIds = newCancelIds;
        oldCancelIds.forEach(d => {
            console.log('cancel ids: ' + d.toHex());
        });
    }

    ///更新订单
    _updateOrder(direct:string, orderId:string, order, targetDecimals:number, orders :Array<MatchOrder>, orderIds) {
        let old = orders.find(o => o.OrderId == orderId);
        if (old == null) {
            const d = new MatchOrder(direct, orderId, order, targetDecimals);
            if (d.Amount > 0) {
                orders.push(d);
            }
        } else {
            old.WhenMatch(order.remain);
            if (old.Amount == 0) {
                this._removeOneOrder(orders, old);
                this._removeOrderId(orderIds,old.OrderId);
            }
        }

    }



    //移除掉一个订单
    _removeOneOrder(array:Array<MatchOrder>, old:MatchOrder) {
        for (let i = 0; i < array.length; i++) {
            const e = array.shift();//移开第一个
            if (e.OrderId == old.OrderId) {
                return;
            } else {
                array.push(e);//下一个
            }
        }
    }

    //移除掉一个id
    _removeOrderId(array, id) {
        for (let i = 0; i < array.length; i++) {
            const e = array.shift();//移开第一个
            if (e == id) {
                return;
            } else {
                array.push(e);//下一个
            }
        }
    }
}
