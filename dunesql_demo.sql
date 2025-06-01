
/* docs:https://docs.dune.com/query-engine/overview
 */

/* 查询 10 条交易数据 */
SELECT
  *
FROM ethereum.transactions
WHERE
  block_number >= 22607800
ORDER BY
  block_number DESC
LIMIT 10

-- 查询过去一天的 ETH 交易量 
SELECT  
  SUM(value / 1e18) AS total_value
FROM ethereum.transactions
WHERE
  block_time > CURRENT_TIMESTAMP - INTERVAL '1' day


-- 查询过去一周每天以太坊交易量：交易表里的时间（转换为day格式），交易量（单位以太币）
SELECT  
  DATE_TRUNC('day', block_time) AS day,
  SUM(value / 1e18) AS total_value
FROM ethereum.transactions
WHERE
  block_time > CURRENT_TIMESTAMP - INTERVAL '7' day
GROUP BY
  1
ORDER BY
  day DESC

/** USDC 交易量 */
select  value / 1000000 as v from  erc20_ethereum.evt_Transfer where contract_address = 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48 limit 1
select  value / cast(power(10, 6) as uint256) as v from  erc20_ethereum.evt_Transfer where contract_address = 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48 limit 1


-- 过去一天的 USDC 交易量
select
    sum(tr.value / 1e6) as v
from erc20_ethereum.evt_Transfer as tr
where contract_address = 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48
   and tr.evt_block_time > CURRENT_TIMESTAMP - Interval '1' day


-- 查询以太坊价格 过去一周的价格
select day, price from prices.usd_daily where day > current_timestamp - interval '7' day and symbol = 'ETH' and contract_address is null


-- 连表查询过去一周的以太坊交易量与价格
    SELECT DATE_TRUNC('day', block_time) AS day, value / 1e18 AS eth_volume, price FROM ethereum.transactions t
    join prices.usd_daily d ON t.block_date = d.day
    WHERE 
    block_time > CURRENT_TIMESTAMP - INTERVAL '7' day
    AND d.symbol = 'ETH'
    AND d.contract_address IS NULL
    and value > 0



-- 连表作为中间表查询过去一周的以太坊交易量
WITH eth_transactions AS (
    SELECT DATE_TRUNC('day', block_time) AS day, value / 1e18 AS eth_volume, price FROM ethereum.transactions t
    join prices.usd_daily d ON t.block_date = d.day
    WHERE 
    block_time > CURRENT_TIMESTAMP - INTERVAL '7' day
    AND d.symbol = 'ETH'
    AND d.contract_address IS NULL
    and value > 0
)

SELECT 
    day,
    SUM(eth_volume * price) AS usd_volume
FROM 
    eth_transactions
group by 1 order by 1 


-- 使用 prices.usd 表查询 ETH 价格  
-- ETH 价格 (30D) 
SELECT
  DATE_TRUNC('day', minute) AS Day,
  MAX(price) AS Top,
  MIN(price) AS Bottom,
  AVG(price) AS Average
FROM
  prices.usd
WHERE
  "symbol" = 'ETH'   /*筛选货币为eth*/
  AND DATE_TRUNC('day', minute) > DATE_TRUNC('day', NOW()) - INTERVAL '30' day  /*筛选30天内的数据*/
GROUP BY  /*按时间分组并且按照时间排序（降序）*/
  1
ORDER BY
  Day DESC 



/* 使用 prices.usd 表查询 ETH 以美元计价交易量查询 */
with txv as 
(select block_time, value, price                /* 根据以下数据创建一个名为txs的新表*/
from ethereum."transactions" e                  /* 从表ethereum.transactions中获取数据，并将表别名为 e*/
join prices."usd" p                             /* 将表与价格表相连，并将其别名为p。联接操作将合并两个表的列*/
on p.minute = date_trunc('minute', e.block_time)/* 联接操作通过 on 指定联接的列，*/
where block_time > now() - interval '7' day     /* 仅获取过去7天的数据*/
and symbol = 'ETH'                              /* 价格表中有很多代币的价格，我们只对ETH的价格感兴趣*/
AND p.contract_address IS NULL
)

select date_trunc('day', block_time) as "Date"  /*从txs表中取到时间（按每天）的数据*/
, sum(value * price / 1e18) as "Value" from txv  /*从txs表中计算出交易额（单位美元）用交易量乘以价格得到*/
group by 1 order by 1   

