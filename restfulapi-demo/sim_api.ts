import * as dotenv from 'dotenv';

// 加载环境变量
dotenv.config();

const SIM_API_KEY = process.env.SIM_API_KEY;
const BASE_URL = 'https://api.sim.dune.com/v1';

// 定义返回类型
interface TokenBalance {
    chain: string;
    chain_id: number;
    address: string;
    amount: string;
    symbol: string;
    name?: string;
    decimals: number;
    price_usd?: number;
    value_usd?: number;
    pool_size?: number;
    low_liquidity?: boolean;
}

interface BalancesResponse {
    wallet_address: string;
    balances: TokenBalance[];
    next_offset?: string;
    request_time: string;
    response_time: string;
}

/**
 * 获取钱包地址的所有代币余额
 * @param address 钱包地址
 * @param chainIds 可选的链ID数组，例如 [1, 137] 表示 Ethereum 和 Polygon
 * @param limit 返回结果的数量限制
 * @param offset 分页偏移量
 */
async function getBalances(
    address: string,
    chainIds?: number[],
    limit?: number,
    offset?: string
): Promise<BalancesResponse> {
    const url = new URL(`${BASE_URL}/evm/balances/${address}`);

    // 添加查询参数
    if (chainIds && chainIds.length > 0) {
        url.searchParams.append('chain_ids', chainIds.join(','));
    }
    if (limit) {
        url.searchParams.append('limit', limit.toString());
    }
    if (offset) {
        url.searchParams.append('offset', offset);
    }

    const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
            'X-Sim-Api-Key': SIM_API_KEY!,
        },
    });

    if (!response.ok) {
        throw new Error(`API请求失败: ${response.status} ${response.statusText}`);
    }

    return (await response.json()) as BalancesResponse;
}

/**
 * 获取钱包地址的特定代币余额
 * @param address 钱包地址
 * @param tokenAddress ERC20代币合约地址
 * @param chainIds 可选的链ID数组
 */
async function getTokenBalance(
    address: string,
    tokenAddress: string,
    chainIds?: number[]
): Promise<BalancesResponse> {
    const url = new URL(`${BASE_URL}/evm/balances/${address}/token/${tokenAddress}`);

    if (chainIds && chainIds.length > 0) {
        url.searchParams.append('chain_ids', chainIds.join(','));
    }

    const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
            'X-Sim-Api-Key': SIM_API_KEY!,
        },
    });

    if (!response.ok) {
        throw new Error(`API请求失败: ${response.status} ${response.statusText}`);
    }

    return (await response.json()) as BalancesResponse;
}

/**
 * 获取钱包地址的原生代币余额（如 ETH, MATIC 等）
 * @param address 钱包地址
 * @param chainIds 可选的链ID数组
 */
async function getNativeBalance(
    address: string,
    chainIds?: number[]
): Promise<BalancesResponse> {
    const url = new URL(`${BASE_URL}/evm/balances/${address}/token/native`);

    if (chainIds && chainIds.length > 0) {
        url.searchParams.append('chain_ids', chainIds.join(','));
    }

    const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
            'X-Sim-Api-Key': SIM_API_KEY!,
        },
    });

    if (!response.ok) {
        throw new Error(`API请求失败: ${response.status} ${response.statusText}`);
    }

    return (await response.json()) as BalancesResponse;
}

/**
 * 格式化代币数量（考虑小数位）
 */
function formatTokenAmount(amount: string, decimals: number): string {
    const value = BigInt(amount);
    const divisor = BigInt(10 ** decimals);
    const integerPart = value / divisor;
    const remainderPart = value % divisor;

    if (remainderPart === BigInt(0)) {
        return integerPart.toString();
    }

    const decimalStr = remainderPart.toString().padStart(decimals, '0');
    return `${integerPart}.${decimalStr.slice(0, 6)}`; // 保留6位小数
}

/**
 * 打印余额信息
 */
function printBalances(data: BalancesResponse) {
    console.log(`\n钱包地址: ${data.wallet_address}`);
    console.log(`\n代币余额列表:\n${'='.repeat(100)}`);

    data.balances.forEach((balance, index) => {
        console.log(`\n${index + 1}. ${balance.name || balance.symbol} (${balance.symbol})`);
        console.log(`   链: ${balance.chain} (Chain ID: ${balance.chain_id})`);
        console.log(`   合约地址: ${balance.address}`);
        console.log(`   格式化数量: ${formatTokenAmount(balance.amount, balance.decimals)}`);

        if (balance.price_usd !== undefined) {
            console.log(`   单价 (USD): $${balance.price_usd}`);
        }
        if (balance.value_usd !== undefined) {
            console.log(`   总价值 (USD): $${balance.value_usd.toFixed(2)}`);
        }
    });

    if (data.next_offset) {
        console.log(`\n分页: 存在更多结果，使用 offset="${data.next_offset}" 获取下一页`);
    }
    console.log(`\n${'='.repeat(100)}\n`);
}

// ============================================
// 演示示例
// ============================================

async function demo() {
    try {
        // 示例钱包地址（Vitalik的地址）
        const vitalikAddress = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045';

        console.log('🚀 Sim API 余额查询\n');

        // 示例 1: 获取所有余额（仅以太坊主网）
        console.log('📊 示例 1: 获取以太坊主网上的所有代币余额');
        console.log('-'.repeat(100));
        const allBalances = await getBalances(vitalikAddress, [1], 10);
        printBalances(allBalances);

        // 示例 2: 获取原生代币余额（ETH）
        console.log('💎 示例 2: 获取原生代币（ETH）余额');
        console.log('-'.repeat(100));
        const nativeBalance = await getNativeBalance(vitalikAddress, [1]);
        printBalances(nativeBalance);

        // 示例 3: 获取特定代币余额（USDC on Ethereum）
        console.log('🪙  示例 3: 获取特定代币（USDC）余额');
        console.log('-'.repeat(100));
        const usdcAddress = '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48'; // USDC on Ethereum
        const usdcBalance = await getTokenBalance(vitalikAddress, usdcAddress, [1]);
        printBalances(usdcBalance);

        // 示例 4: 跨链查询（Ethereum + Polygon）
        console.log('🌐 示例 4: 跨链查询（Ethereum + Polygon）');
        console.log('-'.repeat(100));
        const multiChainBalances = await getBalances(vitalikAddress, [1, 137], 10);
        printBalances(multiChainBalances);

        // 示例 5: 分页示例
        if (allBalances.next_offset) {
            console.log('📄 示例 5: 使用分页获取更多结果');
            console.log('-'.repeat(100));
            const nextPage = await getBalances(vitalikAddress, [1], 10, allBalances.next_offset);
            printBalances(nextPage);
        }

    } catch (error) {
        console.error('❌ 错误:', error);
    }
}

// 运行演示
if (require.main === module) {
    demo();
}

// 导出函数供其他模块使用
export {
    getBalances,
    getTokenBalance,
    getNativeBalance,
    formatTokenAmount,
    BalancesResponse,
    TokenBalance,
};
