var Decimal = Decimal || require('decimal');
import type {  MatchOrder}  from './MatchOrder';

//监听回复
class SubResponse {
    Event: string;
    constructor(ev:string) {
        this.Event = ev;
    }
}
//深度数据回复
class DeepResponse extends SubResponse{
    constructor(pair: string, deep: number, direct: string, orders: Array<MarketDetail> ) {
        super('deep');
        this.Deep = deep;
        this.Direct = direct;
        this.Orders = orders;
        this.PairName = pair;
    }

    Direct: string;
    PairName: string;
    Deep: number;
    Orders: Array<MarketDetail>;
    public ToJsonString() {
        const jsonObject =
        {
            ev: this.Event,
            d: this.Deep,
            di: this.Direct,
            n: this.PairName,
            ords: this.Orders.map(o => {
                return {
                    p: o.Price,
                    o: o.Origin,
                    a: o.Amount
                }
            }),
        };
        return JSON.stringify(jsonObject);
    }
}
//市场详情
class MarketDetail {
    Price: number;
    Origin: number;
    Amount: number;

    constructor(price: number, origin: number, amount: number) {
        this.Price = price;
        this.Origin = origin;
        this.Amount = amount;
    }
}
//用户订单详情
class UserOrderDetail extends MarketDetail {
    BlockNumber: number;
    Canceling: boolean;
    OrderId: string;

    constructor(order:MatchOrder) {
        super(order.Price,order.Origin, order.Amount);
        this.BlockNumber = order.BlockNumber;
        this.Canceling = order.IsCanceling;
        this.OrderId = order.OrderId;
    }
}
//用户实时订单回复
class OrderResponse extends SubResponse {
    Direct: string;
    PairName: string;
    Orders: Array<UserOrderDetail>;
    User:String;
    constructor(user:string,direct:string, pair :string, orders:Array<MatchOrder>) {
        super('order');
        this.User = user;
        this.Direct = direct;
        this.PairName = pair;
        this.Orders = orders.map(a => {
           return new UserOrderDetail(a)
        }).sort((a, b) => b.BlockNumber - a.BlockNumber);
    }

    public ToJsonString() {
        const jsonObject =
        {
            u: this.User,
            ev: this.Event,
            di: this.Direct,
            n: this.PairName,
            ords: this.Orders.map(o => {
                return {
                    p: o.Price,
                    o: o.Origin,
                    a: o.Amount,
                    b: o.BlockNumber,
                    c: o.Canceling,
                    id:o.OrderId
                }
            }),
        };
        return JSON.stringify(jsonObject);
    }
}
    //订单列表转深度数据
    function ToDeepData(datas: Array<MatchOrder>, deep: number, pair: string, direct: string): DeepResponse {
        const temp = Array<MarketDetail>();
        datas.forEach(item => {
            temp.push(new MarketDetail(item.ToDeep(deep), item.Origin, item.Amount));
        });
        const result = [];
        temp.reduce(function (res, value:MarketDetail) {
            if (!res[value.Price]) {
                res[value.Price] = new MarketDetail(value.Price, value.Origin, value.Amount);
                result.push(res[value.Price])
            } else {
                 res[value.Price].Origin = Decimal(value.Origin).add(Decimal(res[value.Price].Origin)).toNumber();
                res[value.Price].Amount = Decimal(value.Amount).add(Decimal(res[value.Price].Amount)).toNumber();
            }
            return res;
        }, {});
        return new DeepResponse(pair, deep, direct, result);
    }

    ///所有深度的数据
    function GetAllDeepData(datas: Array<MatchOrder>, pair: string, direct: string):Array<DeepResponse> {
        const result = [];
        for (let i = 0; i <= 8; i++) {
            const t = ToDeepData(datas, i, pair, direct);
            if (t != null) {
                result.push(t);
            }
        }
        return result;
    }
export { DeepResponse, MarketDetail, UserOrderDetail, OrderResponse,ToDeepData,GetAllDeepData};