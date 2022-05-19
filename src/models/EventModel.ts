import commonConfig from '../config/common.json';
export class MatchResult {
    Index: number;
    BuyId: string;
    SellId: string;
    Base: number;
    Target: number;
    Price: number;
    BaseOffset: number;
    TargetOffset: number;
    //target
    BuyFee: number;
    //base
    SellFee: number;

    constructor(data) {
        this.Index = data[0].toString();
        const config = commonConfig.Matches.find(f => f.MatchIndex == data[0].toString());
        this.BuyId = data[1].toString();
        this.SellId = data[2].toString();
        this.Base = data[3].toString() / Math.pow(10, config.BaseDecimals);
        this.Target = data[4].toString() / Math.pow(10, config.TargetDecimals);
        this.Price = data[5].toString() / Math.pow(10, commonConfig.PriceDecimals);
        this.BaseOffset = data[6].toString() / Math.pow(10, config.BaseDecimals);
        this.TargetOffset = data[7].toString() / Math.pow(10, config.TargetDecimals);
        this.BuyFee = data[8].toString()/ Math.pow(10, config.TargetDecimals);
        this.SellFee = data[9].toString()/ Math.pow(10, config.BaseDecimals);
    }
}

export class UserOrder {
    Index: number;
    OrderId: string;
    Price: number;
    //发布sell -> target数量  buy -> base数量
    From: number;
    //实际目标数量 sell -> base数量  buy -> target数量
    To: number;
    Direct: string;
    User: string;
    Create(data, direct:string, user:string) {
        this.Index = data[0].toString();
        const config = commonConfig.Matches.find(f => f.MatchIndex == data[0].toString());
        this.OrderId = data[1].toString();
        this.Price = data[2].toString() / Math.pow(10, commonConfig.PriceDecimals);
        this.From = data[3].toString() / Math.pow(10, direct == 'Buy' ? config.BaseDecimals : config.TargetDecimals);
        this.To = data[4].toString() / Math.pow(10, direct == 'Buy' ? config.TargetDecimals : config.BaseDecimals);
        this.Direct = direct;
        this.User = user;
    }
}

export class CancelOrder {
    Index: number;
    OrderId: string;
    //原值未处理 sell -> target数量  buy -> base数量 
    Back: number;
    constructor(data) {
        this.Index = data[0].toString();
        this.OrderId = data[1].toString();
        this.Back = data[2].toString();
    }
}