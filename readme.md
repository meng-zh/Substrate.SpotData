监听 subtrate 上的 撮合模块
    更改数据类型在 ./src/config/Types.json
    更改监听模块、事件名 在 ./src/config/common.json
    更改事件数据分析  ./src/models/EventModel.ts

作为 webServer 提供市场及用户实时订单数据



    ## webSocket 接口说明
​    **订阅的数据结构为**：
​    {
​        "op":"sub"//订阅 "unsub" //取消订阅
​        "ev":"订阅类型"//deep 市场行情深度, price ,当前价格，order 用户当前订单
​        "args":[]//参数数组 
​    }
​    **订阅 市场**
​        参数：币对名,深度(0-8),数据长度
​        Tip: 更改数据长度请先取消订阅后重新发起订阅
​        例如：{"op":"sub","ev":"deep","args":["B/A","8","10"]}

        返回说明：ev:deep 深度数据
                 d:8  深度
                 di:Buy /Sell 买单/卖单
                 n:"B/A" 币对名
                 ords:市场数据
                    p:价格
                    o:发布数量
                    a:剩余数量
        例如：{"ev":"deep","d":"8","di":"Buy","n":"B/A","ords":[{"p":0.011,"o":2.288029,"a":2.288019},{"p":0.0001,"o":1,"a":0.98}]}

​    取消订阅深度
​    例如：{"op":"unsub","ev":"deep","args":["B/A","8","10"]}

​    **订阅用户当前订单**
​        参数：币对名,用户地址
​        Tip:返回分买单和卖单
​        例如：{"op":"sub","ev":"order","args":["B/A","5FFV6ytTRyMvgC3Y1Zon453XpRCkQSWk8tBmf3y64bE5nFk2"]}

        返回说明：u:用户地址
                ev:order 订单数据
                di: Buy/Sell 买单/卖单
                n:"B/A" 币对名
                ords：订单列表
                    p:价格
                    o:发布数量
                    a:剩余数量
                    b:发布高度
                    id:订单号
        例如：{"u":"5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty","ev":"order","di":"Buy","n":"B/A","ords":[{"p":0.0001,"o":1,"a":1,"b":"5175","id":"0x700f5bd17b7508a884d305447a5bd4559e31657404cec9f54dd48ec855a00c94"}]}

​    取消订阅用户当前订单
​        例如：{"op":"unsub","ev":"order","args":["B/A","5FFV6ytTRyMvgC3Y1Zon453XpRCkQSWk8tBmf3y64bE5nFk2"]}

​    **订阅当前币对价格**
​        参数：币对名(args:[] 表示订阅所有币对 )
​        例如：{"op":"sub","ev":"price","args":["B/A"]}



##TODO
错误记录，容错处理
价格K线接口，当前价格的详细