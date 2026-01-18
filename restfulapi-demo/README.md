# RESTful API Demo

这个项目包含了使用 Alchemy API、Dune API 和 Sim API 的演示脚本。

## 环境配置

1. 复制 `.env` 文件并填入你的 API 密钥：

```bash
ALCHEMY_API_KEY=your_alchemy_api_key_here
DUNE_API_KEY=your_dune_api_key_here
SIM_API_KEY=your_sim_api_key_here
```

### 获取 API 密钥

- **Alchemy API Key**: 在 [Alchemy Dashboard](https://dashboard.alchemy.com/) 创建你的 API 密钥
- **Dune API Key**: 在 [Dune Dashboard](https://dune.com/settings/api) 创建你的 API 密钥
- **Sim API Key**: 在 [Sim Dashboard](https://sim.dune.com) 创建你的 API 密钥

## 安装依赖

```bash
npm install
```

## 脚本说明

### 1. Alchemy Portfolio API (`alchemy_api.ts`)

用于查询钱包在多个区块链网络上的代币余额和价格信息。

#### 主要功能

- `getTokensByAddress()`: 获取钱包在指定网络上的所有代币
- `formatTokenAmount()`: 格式化代币数量
- `printTokens()`: 打印代币信息

#### 支持的网络

- 以太坊：`eth-mainnet`, `eth-sepolia`
- Polygon：`polygon-mainnet`, `polygon-amoy`
- Arbitrum：`arb-mainnet`, `arb-sepolia`
- Optimism：`opt-mainnet`, `opt-sepolia`
- Base：`base-mainnet`, `base-sepolia`
- BNB Chain：`bnb-mainnet`, `bnb-testnet`
- Avalanche：`avax-mainnet`, `avax-fuji`

#### 使用方法

```bash
npm run alchemy
// 或 
pnpm alchemy
```

#### 代码示例

```typescript
import { getTokensByAddress } from './alchemy_api';

// 示例 1: 获取单个网络的代币
const tokens = await getTokensByAddress([
    {
        address: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
        networks: ['eth-mainnet'],
    },
]);

// 示例 2: 跨链查询
const multiChain = await getTokensByAddress([
    {
        address: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
        networks: ['eth-mainnet', 'polygon-mainnet', 'arb-mainnet'],
    },
]);

// 示例 3: 只获取原生代币
const nativeOnly = await getTokensByAddress(
    [
        {
            address: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
            networks: ['eth-mainnet'],
        },
    ],
    {
        includeErc20Tokens: false,
        includeNativeToken: true,
    }
);

// 示例 4: 查询多个地址
const multiAddress = await getTokensByAddress([
    {
        address: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
        networks: ['eth-mainnet'],
    },
    {
        address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
        networks: ['polygon-mainnet'],
    },
]);
```

#### API 参数

**请求参数：**
- `addresses`: 地址和网络数组
  - `address`: 钱包地址
  - `networks`: 要查询的网络数组

**可选参数：**
- `includeMetadata`: 是否包含代币元数据（默认 `true`）
- `includePrices`: 是否包含代币价格（默认 `true`）
- `includeNativeToken`: 是否包含原生代币（默认 `true`）
- `includeErc20Tokens`: 是否包含 ERC-20 代币（默认 `true`）
- `pageKey`: 分页键，用于获取下一页结果

**返回数据：**
- 代币余额（原始值和格式化值）
- 代币元数据（名称、符号、小数位、Logo）
- 代币价格（USD）
- 钱包总价值

---

### 2. Dune Query API (`dune_query.ts`)

用于执行 Dune 查询并获取结果的脚本。

#### 主要功能

- `executeQuery()`: 执行指定的 Dune 查询
- `getExecutionResult()`: 获取查询执行结果
- `waitForQueryCompletion()`: 轮询等待查询完成
- `runQuery()`: 一站式执行查询并获取结果

#### 使用方法

```bash
npm run dune
```

#### 代码示例

```typescript
import { runQuery, executeQuery, getExecutionResult } from './dune_query';

// 示例 1: 简单查询
const result = await runQuery(3746561);

// 示例 2: 带参数的查询
const params = {
    blockchain: 'ethereum',
    limit: 100,
};
const result = await runQuery(3746561, params);

// 示例 3: 使用高性能级别
const result = await runQuery(3746561, undefined, 'large');

// 示例 4: 分步执行
const execution = await executeQuery(3746561);
const result = await getExecutionResult(execution.execution_id);
```

#### API 参考

**执行查询 (Execute Query)**
- **端点**: `POST https://api.dune.com/api/v1/query/{query_id}/execute`
- **参数**:
  - `query_parameters`: 查询参数（可选）
  - `performance`: 性能级别 - `medium` 或 `large`（默认 `medium`）
- **返回**: `execution_id` 和 `state`

**获取结果 (Get Execution Result)**
- **端点**: `GET https://api.dune.com/api/v1/execution/{execution_id}/results`
- **参数**:
  - `limit`: 限制返回行数
  - `offset`: 分页偏移量
  - `columns`: 指定返回的列（逗号分隔）
  - `filters`: 过滤条件（类似 SQL WHERE 子句）
  - `allow_partial_results`: 是否允许部分结果

### 3. Sim API (`sim_api.ts`)

用于查询钱包余额的脚本。

#### 主要功能

- `getBalances()`: 获取钱包所有代币余额
- `getTokenBalance()`: 获取特定代币余额
- `getNativeBalance()`: 获取原生代币余额（如 ETH）

#### 使用方法

```bash
npm run sim
```

#### 代码示例

```typescript
import { getBalances, getTokenBalance, getNativeBalance } from './sim_api';

// 获取所有余额
const balances = await getBalances('0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045', [1], 10);

// 获取 USDC 余额
const usdcBalance = await getTokenBalance(
    '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
    '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
    [1]
);

// 获取 ETH 余额
const ethBalance = await getNativeBalance('0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045', [1]);
```

## 注意事项

1. **查询 ID**: 在使用 Dune Query API 时，你需要提供有效的查询 ID。可以从 Dune 网站的查询 URL 中获取，例如 `https://dune.com/queries/1234567` 中的 `1234567`。

2. **性能级别**: 
   - `medium`: 适合大多数查询（默认）
   - `large`: 适合复杂查询，消耗更多积分

3. **结果存储**: Dune API 的查询结果会存储 90 天，可以在响应的 `expires_at` 字段中查看。

4. **数据点限制**: 默认有 250,000 数据点的限制，如需突破限制，使用 `ignore_max_datapoints_per_request=true` 参数。

5. **分页**: 对于大结果集，使用 `limit` 和 `offset` 参数进行分页。

## API 文档

- [Alchemy Portfolio API](https://www.alchemy.com/docs/data/portfolio-apis/portfolio-api-endpoints/portfolio-api-endpoints/get-tokens-by-address)
- [Dune Execute Query API](https://docs.dune.com/api-reference/executions/endpoint/execute-query)
- [Dune Get Execution Result API](https://docs.dune.com/api-reference/executions/endpoint/get-execution-result)
- [Sim API Documentation](https://api.sim.dune.com/docs)

## 故障排除

### API Key 错误
确保 `.env` 文件中的 API 密钥正确无误。

### 查询超时
如果查询执行时间过长，可以调整 `waitForQueryCompletion()` 函数的 `maxWaitTime` 参数。

### 查询失败
查看返回的 `error` 字段了解具体错误信息，常见错误包括：
- 语法错误
- 参数错误
- 权限不足
- 查询超时
