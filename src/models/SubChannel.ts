
export class SubChannel {
    Operater:string;
    Event:string;
    Args:string[];

    constructor(json:string) {
        try {
            const obj = JSON.parse(json);
            this.Operater = obj.op;
            this.Event = obj.ev;
            this.Args = obj.args;
        }
        catch {
            return undefined;
        }
    }
    //{"op":"sub","ev":"deep","args":["B/A","8","10"]}
    GetMathDeep() {
        if (this.Args.length != 3) return null;
        return new SubMathDeep(this.Args[0], this.Args[1], this.Args[2]);
    }
    //{"op":"sub","ev":"price","args":["B/A"]}
    GetPrice() {
        if (this.Args.length == 0) return new SubPrice("");
        else if (this.Args.length == 1) return new SubPrice(this.Args[0]);
        else return null;
    }
    //{"op":"sub","ev":"order","args":["B/A","地址"]}
    GetUserOrder() {
        if (this.Args.length != 2) return null;
        return new SubOrder(this.Args[0], this.Args[1]);
    }
}

export class Pair {
    PairName:string;
    MatchIndex:number;
    constructor(pair) {
        this.PairName = pair;

    }
    SetMatchIndex(index) {
        this.MatchIndex = index;
    }
}

///订阅深度
export class SubMathDeep extends Pair{
    Deep:number;
    Len:number;
    constructor(pair, deep, len) {
        super(pair);
        //0-8
        this.Deep = deep;
        this.Len = len;

    }
}

///订阅价格
export class SubPrice extends Pair {
    //所有类型
    All:boolean;
    constructor(pair)
    {
        super(pair);
        if (pair == "") {
            this.All = true;
        } 
    }
}

///订阅订单
export class SubOrder extends Pair {
    User:string;
    constructor(pair, user) {
        super(pair);
        this.User = user;
    }
}
