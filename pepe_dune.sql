
-- 转账明细
select "from", "to", value, evt_block_date from erc20_ethereum.evt_transfer where contract_address=0x6982508145454ce325ddbe47a25d4ec3d2311933 and evt_block_number >= 17046105 limit 10;
select * from pepe_multichain.pepetoken_evt_transfer where contract_address=0x6982508145454ce325ddbe47a25d4ec3d2311933 limit 1;


-- select * from erc20_ethereum.evt_transfer where evt_block_number>=17046105 and contract_address = 0x6982508145454ce325ddbe47a25d4ec3d2311933
-- select * from shib_ethereum.SHIB_evt_Transfer limit 10

-- select "from", "to", value, evt_block_date from erc20_ethereum.evt_transfer where contract_address=0x6982508145454ce325ddbe47a25d4ec3d2311933 and evt_block_number >= 17046105 limit 10;


-- select * from pepe_multichain.pepetoken_evt_transfer where contract_address=0x6982508145454ce325ddbe47a25d4ec3d2311933 limit 1;

-- 用户持仓明细
WITH
  balance_changes AS (
    SELECT
      "from" AS address,
      - value AS balance_change
    FROM
      erc20_ethereum.evt_transfer
      where contract_address=0x6982508145454ce325ddbe47a25d4ec3d2311933 and evt_block_number >= 17046105
    UNION ALL
    SELECT
      "to" AS address,
      value AS balance_change
    FROM
      erc20_ethereum.evt_transfer
      where contract_address=0x6982508145454ce325ddbe47a25d4ec3d2311933 and evt_block_number >= 17046105
  ),
  address_balances AS (
    SELECT
      address,
      SUM(balance_change)/1e18 AS balance
    FROM
      balance_changes
    GROUP BY
      address
    HAVING
      SUM(balance_change) > 0
  )
SELECT
  *
FROM
  address_balances
ORDER BY balance desc;


-- 总持币数量及发行量
select 
count(address) as holders,
sum(balance) as totalSupply
from  query_5218166


-- 每日交易笔数
select DATE_TRUNC('day', evt_block_time) day, count(*) as txs
from erc20_ethereum.evt_transfer 
where contract_address=0x6982508145454ce325ddbe47a25d4ec3d2311933 and evt_block_time >= CURRENT_TIMESTAMP - INTERVAL '180' day
group by 1
order by 1 

-- pepe 价格
select * from prices.usd where blockchain='ethereum' and contract_address=0x6982508145454ce325ddbe47a25d4ec3d2311933 limit 10;

-- 输出每天的交易总额(过去 7 天)
WITH daily_transactions AS (
select DATE_TRUNC('day', evt_block_time) day, SUM(value) / 1e18 AS total_transfer_amount
from erc20_ethereum.evt_transfer 
where contract_address=0x6982508145454ce325ddbe47a25d4ec3d2311933 and evt_block_time >= CURRENT_TIMESTAMP - INTERVAL '7' day
group by 1
order by 1 
),

pepe_daily_volume as (
    select dt.day, total_transfer_amount, price from daily_transactions dt JOIN prices.usd_daily d on d.day = dt.day
    where d.contract_address = 0x6982508145454ce325ddbe47a25d4ec3d2311933 and d.blockchain = 'ethereum' 
)


SELECT 
    day,
    SUM(total_transfer_amount * price) AS usd_volume
FROM 
    pepe_daily_volume
group by 1 order by 1 