const { BN } = require('@polkadot/util');

export class MatchOrder {
    Direct :string;
    OrderId :string;
    User :string;
    Amount:number;
    Origin:number;
    Price:number;
    private TargetDecimals:number;
    BlockNumber:number;
    IsCanceling:boolean;

    constructor(direct :string, id :string, order, targetDecimals:number) {
        this.Direct = direct;
        this.OrderId = id;
        this.User = order.user.toString();
        //剩余数量
        this.Amount = new BN(order.remain.toNumber()) / Math.pow(10, targetDecimals);
        //发布数量
        this.Origin = new BN(order.to.toNumber()) / Math.pow(10, targetDecimals);
        this.Price = new BN(order.price.toNumber()) / Math.pow(10, 12);
        this.TargetDecimals = targetDecimals;
        this.BlockNumber = order.number.toString();
    }

    
    ToDeep(index:number):number {
        let value = Math.trunc(this.Price);
        if (index != 0) {
            const pow = Math.pow(10, index);
            value = Math.trunc(this.Price * pow) / pow;
        }
        return value;
    }

    WhenMatch(remain) {
        const amount = new BN(remain.toNumber());
        this.Amount = amount / Math.pow(10, this.TargetDecimals);
    }

    WhenCancel(flag) {
        this.IsCanceling = flag;
    }
}