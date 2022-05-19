import { UserOrder, MatchResult, CancelOrder } from './EventModel';
var Decimal = Decimal || require('decimal');


export class BlockHeight {
    BlockNumber: number;

    constructor(number: number) {
        this.BlockNumber = number;
    }
    async save(query) {
        var result = await query('SELECT COUNT(0) as Count FROM Block_Height WHERE BlockNumber = ?', this.BlockNumber);
        if (result[0].Count == 1) {
            return;
        }
        await query('Insert into Block_Height (`BlockNumber`) values (?)', [this.BlockNumber]);
    }
}
///当前记录的最高高度
export async function GetMaxHeight(query): Promise<number> {
    var result = await query('SELECT ifnull(MAX(BlockNumber),1) as m FROM Block_Height ');
    return result[0].m;
}
///当前记录的最低高度
export async function GetMinHeight(query): Promise<number> {
    var result = await query('SELECT ifnull(Min(BlockNumber),1) as m FROM Block_Height ');
    return result[0].m;
}

export async function DeleteHeight(query,num: number){
    await query('DELETE FROM Block_Height Where BlockNumber = ? ', [num]);
}

///订单记录
export class MatchTx extends UserOrder {
    BlockNumber: number;
    Hash: string;
    ///状态 waiting finish cancel
    Status: string;
    HandleBase: number;
    HandleTarget: number;
    HandlePrice: number;
    Fee: number;
    Time: number;

    CreateTx(number: number, hash: string, ts: number, data, direct: string, user: string): MatchTx {
        super.Create(data, direct, user);
        this.BlockNumber = number;
        this.Hash = hash;
        this.Status = 'waiting';
        this.Time = ts;
        this.HandleBase = 0;
        this.HandleTarget = 0;
        this.HandlePrice = 0;
        this.Fee = 0;
        return this;
    }

    async Save(query) {
        var result = await query('SELECT COUNT(0) as Count FROM Match_Tx WHERE OrderId = ?', [this.OrderId]);
        if (result[0].Count == 1) {
            return;
        }
        await query('INSERT INTO Match_Tx (`BlockNumber`, `Hash`, `Status`, `Index`, `OrderId`, `Price`, `From`, `To`, `Direct`, `User`, `HandleBase`, `HandleTarget`, `HandlePrice`, `Fee`, `Time`) '
            + 'VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);', [this.BlockNumber, this.Hash,
            this.Status, this.Index, this.OrderId, this.Price, this.From, this.To, this.Direct, this.User, this.HandleBase, this.HandleTarget, this.HandlePrice, this.Fee, this.Time]);

    }
    async UpdateWhenMatch(query) {
        await query('UPDATE Match_Tx Set Status = ?,HandleBase = ?,HandleTarget=?,HandlePrice=?,Fee=? '
            + ' WHERE OrderId = ? ', [this.Status, this.HandleBase, this.HandleTarget, this.HandlePrice, this.Fee, this.OrderId]);
    }

    WhenMatch(result: MatchResult) {
        if (this.Status == 'finish') return;
        this.HandleBase = Decimal(result.Base).add(Decimal(this.HandleBase)).toNumber();
        this.HandleTarget = Decimal(result.Target).add(Decimal(this.HandleTarget)).toNumber();
        this.HandlePrice = this.HandlePrice == 0 ? result.Price
            : Decimal(result.Price).add(Decimal(this.HandlePrice)).div(2).toNumber();
        if (this.Direct == 'Buy') {
            if (result.BuyFee > 0) {
                this.Fee = Decimal(result.BuyFee).add(Decimal(this.Fee)).toNumber();
            }
            if (result.BaseOffset > 0) {
                this.Status = 'finish';
            }
            if (result.BaseOffset > 0 || this.HandleTarget == this.To || this.HandleBase + result.BaseOffset >= this.From) {
                this.Status = "finish";
            }
        } else if (this.Direct == 'Sell') {
            if (result.SellFee > 0) {
                this.Fee = Decimal(result.SellFee).add(Decimal(this.Fee)).toNumber();
            }
            if (result.TargetOffset > 0) {
                this.Status = 'finish';
            }
            if (result.TargetOffset > 0 || this.HandleBase == this.To || this.HandleTarget + result.TargetOffset == this.From) {
                this.Status = "finish";
            }
        }
    }
}

//取消交易
export async function CancelMatchTx(query, orderId: string) {
    await query('UPDATE Match_Tx Set Status = ? WHERE OrderId = ? ', ['cancel', orderId]);
}

//读取matchTx
export async function QueryMatchTx(query, orderId: string): Promise<MatchTx> {
    var result = await query('Select * FROM Match_Tx WHERE OrderId = ?', [orderId]);
    if (result.length == 0) return Promise.resolve(null);
    else {
        var tx: MatchTx = new MatchTx();
        tx.BlockNumber = result[0].BlockNumber;
        tx.Hash = result[0].Hash;
        tx.Status = result[0].Status;
        tx.HandleBase = result[0].HandleBase;
        tx.HandleTarget = result[0].HandleTarget;
        tx.HandlePrice = result[0].HandlePrice;
        tx.Fee = result[0].Fee;
        tx.Time = result[0].Time;
        tx.Index = result[0].Index;
        tx.OrderId = result[0].OrderId;
        tx.Price = result[0].Price;
        tx.From = result[0].From;
        tx.To = result[0].To;
        tx.Direct = result[0].Direct;
        tx.User = result[0].User;
        return Promise.resolve(tx);
    }
}

///结果数据 系统事件中
export class MatchResultTx extends MatchResult {
    //自增 key
    Id:number;
    BlockNumber: number;
    Time: number;
    constructor(number: number, ts: number, data) {
        super(data);
        this.BlockNumber = number;
        this.Time = ts;
    }

    async Save(query) {
        await query('INSERT INTO Match_Result_Tx (`BlockNumber`, `Index`, `BuyId`, `SellId`, `Base`, `Target`, `Price`, `BaseOffset`, `TargetOffset`, `BuyFee`, `SellFee`, `Time`) '
            + ' VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);',
            [this.BlockNumber, this.Index, this.BuyId, this.SellId, this.Base, this.Target, this.Price, this.BaseOffset, this.TargetOffset, this.BuyFee, this.SellFee, this.Time]);
    }
}

///取消记录 系统事件中
export class MatchCancelTx extends CancelOrder {
    //自增 key
     Id:number;
    BlockNumber: number;
    Time: number;
    constructor(number: number, ts: number, data) {
        super(data);
        this.BlockNumber = number;
        this.Time = ts;
    }
    async Save(query) {
        await query('INSERT INTO Match_Cancel_Tx (`BlockNumber`, `Index`, `OrderId`, `Back`, `Time`) VALUES (?, ?, ?, ?, ?);',
            [this.BlockNumber, this.Index, this.OrderId, this.Back, this.Time]);
    }
}