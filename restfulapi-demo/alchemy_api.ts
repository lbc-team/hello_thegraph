import * as dotenv from 'dotenv';

// 加载环境变量
dotenv.config();

const ALCHEMY_API_KEY = process.env.ALCHEMY_API_KEY;
const BASE_URL = 'https://api.g.alchemy.com/data/v1';

// 支持的网络类型
type Network =
    | 'eth-mainnet'
    // | 'eth-sepolia'
    | 'polygon-mainnet'
    | 'polygon-amoy'
    | 'arb-mainnet'
    // | 'arb-sepolia'
    | 'opt-mainnet'
    // | 'opt-sepolia'
    | 'base-mainnet'
    // | 'base-sepolia'
    | 'bnb-mainnet'
    // | 'bnb-testnet'
    | 'avax-mainnet'
// | 'avax-fuji';

// 定义类型接口
interface AddressNetwork {
    address: string;
    networks: Network[];
}

interface TokenMetadata {
    decimals: number;
    logo?: string;
    name: string;
    symbol: string;
}

interface TokenPrice {
    currency: string;
    value: string;
    lastUpdatedAt: string;
}

interface Token {
    address: string;
    network: string;
    tokenAddress: string | null; // null 表示原生代币
    tokenBalance: string;
    tokenMetadata?: TokenMetadata;
    tokenPrices?: TokenPrice[];
    error?: string;
}

interface TokensResponse {
    data: {
        tokens: Token[];
        pageKey?: string;
    };
}

interface GetTokensOptions {
    includeMetadata?: boolean;
    includePrices?: boolean;
    includeNativeToken?: boolean;
    includeErc20Tokens?: boolean;
    pageKey?: string;
}

/**
 * 获取钱包地址的所有代币
 * @param addresses 地址和网络的数组
 * @param options 可选参数
 */
async function getTokensByAddress(
    addresses: AddressNetwork[],
    options?: GetTokensOptions
): Promise<TokensResponse> {
    const url = `${BASE_URL}/${ALCHEMY_API_KEY}/assets/tokens/by-address`;

    const body: any = {
        addresses,
    };

    // 添加可选参数
    if (options?.includeMetadata !== undefined) {
        body.includeMetadata = options.includeMetadata;
    }
    if (options?.includePrices !== undefined) {
        body.includePrices = options.includePrices;
    }
    if (options?.includeNativeToken !== undefined) {
        body.includeNativeToken = options.includeNativeToken;
    }
    if (options?.includeErc20Tokens !== undefined) {
        body.includeErc20Tokens = options.includeErc20Tokens;
    }
    if (options?.pageKey) {
        body.pageKey = options.pageKey;
    }

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API请求失败: ${response.status} ${response.statusText}\n${errorText}`);
    }

    return (await response.json()) as TokensResponse;
}

/**
 * 格式化代币数量（考虑小数位）
 */
function formatTokenAmount(balance: string, decimals: number): string {
    try {
        const value = BigInt(balance);
        const divisor = BigInt(10 ** decimals);
        const integerPart = value / divisor;
        const remainderPart = value % divisor;

        if (remainderPart === BigInt(0)) {
            return integerPart.toString();
        }

        const decimalStr = remainderPart.toString().padStart(decimals, '0');
        // 移除尾部的零
        const trimmedDecimal = decimalStr.replace(/0+$/, '');
        if (trimmedDecimal === '') {
            return integerPart.toString();
        }
        return `${integerPart}.${trimmedDecimal}`;
    } catch (error) {
        return balance; // 如果格式化失败，返回原始值
    }
}

/**
 * 打印代币信息
 */
function printTokens(response: TokensResponse) {
    console.log(`\n${'='.repeat(100)}`);
    console.log(`代币列表`);
    console.log(`${'='.repeat(100)}\n`);

    const tokens = response.data.tokens;

    if (tokens.length === 0) {
        console.log('未找到代币');
        return;
    }

    // 按地址和网络分组
    const groupedTokens = new Map<string, Token[]>();

    tokens.forEach((token) => {
        const key = `${token.address}@${token.network}`;
        if (!groupedTokens.has(key)) {
            groupedTokens.set(key, []);
        }
        groupedTokens.get(key)!.push(token);
    });

    groupedTokens.forEach((tokens, key) => {
        const [address, network] = key.split('@');
        console.log(`\n钱包地址: ${address}`);
        console.log(`网络: ${network}`);
        console.log(`代币数量: ${tokens.length}`);
        console.log(`${'-'.repeat(100)}`);

        tokens.forEach((token, index) => {
            if (token.error) {
                console.log(`\n${index + 1}. ❌ 错误: ${token.error}`);
                return;
            }

            const isNative = token.tokenAddress === null;
            const metadata = token.tokenMetadata;

            console.log(`\n${index + 1}. ${metadata?.name || 'Unknown'} (${metadata?.symbol || 'N/A'}) ${isNative ? '🔷 原生代币' : ''}`);

            if (!isNative) {
                console.log(`   合约地址: ${token.tokenAddress}`);
            }

            if (metadata) {
                // console.log(`   余额 (原始): ${token.tokenBalance}`);
                console.log(`   余额 (格式化): ${formatTokenAmount(token.tokenBalance, metadata.decimals)}`);
                // console.log(`   小数位: ${metadata.decimals}`);

                if (metadata.logo) {
                    console.log(`   Logo: ${metadata.logo}`);
                }
            } else {
                console.log(`   余额: ${token.tokenBalance}`);
            }

            if (token.tokenPrices && token.tokenPrices.length > 0) {
                token.tokenPrices.forEach((price) => {
                    console.log(`   价格 (${price.currency.toUpperCase()}): $${price.value}`);
                    console.log(`   价格更新时间: ${price.lastUpdatedAt}`);

                    // 计算总价值
                    if (metadata) {
                        const formattedBalance = parseFloat(formatTokenAmount(token.tokenBalance, metadata.decimals));
                        const priceValue = parseFloat(price.value);
                        const totalValue = formattedBalance * priceValue;
                        console.log(`   总价值: $${totalValue.toFixed(2)}`);
                    }
                });
            }
        });

        console.log(`\n${'-'.repeat(100)}`);

        // 计算总价值
        let totalValue = 0;
        let hasValidPrices = false;

        tokens.forEach((token) => {
            if (token.tokenPrices && token.tokenPrices.length > 0 && token.tokenMetadata) {
                const formattedBalance = parseFloat(formatTokenAmount(token.tokenBalance, token.tokenMetadata.decimals));
                const priceValue = parseFloat(token.tokenPrices[0].value);
                totalValue += formattedBalance * priceValue;
                hasValidPrices = true;
            }
        });

        if (hasValidPrices) {
            console.log(`\n💰 钱包总价值: $${totalValue.toFixed(2)}`);
        }
    });

    if (response.data.pageKey) {
        console.log(`\n📄 分页: 存在更多结果，使用 pageKey="${response.data.pageKey}" 获取下一页`);
    }

    console.log(`\n${'='.repeat(100)}\n`);
}

// ============================================
// 演示示例
// ============================================

async function demo() {
    try {
        // 示例钱包地址
        const vitalikAddress = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045';

        console.log('🚀 Alchemy Portfolio API 代币查询演示\n');

        // 示例 1: 获取以太坊主网上的所有代币
        console.log('📊 示例 1: 获取以太坊主网上的所有代币（包含价格和元数据）');
        console.log('-'.repeat(100));
        const ethTokens = await getTokensByAddress([
            {
                address: vitalikAddress,
                networks: ['eth-mainnet'],
            },
        ]);
        printTokens(ethTokens);

        // 示例 2: 跨链查询（以太坊 + Polygon + Arbitrum）
        console.log('📊 示例 2: 跨链查询（以太坊 + Polygon + Arbitrum）');
        console.log('-'.repeat(100));
        const multiChainTokens = await getTokensByAddress([
            {
                address: vitalikAddress,
                networks: ['eth-mainnet', 'polygon-mainnet', 'arb-mainnet'],
            },
        ]);
        printTokens(multiChainTokens);

        // 示例 3: 只获取原生代币（不包含 ERC-20）
        console.log('📊 示例 3: 只获取原生代币');
        console.log('-'.repeat(100));
        const nativeOnly = await getTokensByAddress(
            [
                {
                    address: vitalikAddress,
                    networks: ['eth-mainnet', 'polygon-mainnet', 'arb-mainnet'],
                },
            ],
            {
                includeErc20Tokens: false,
                includeNativeToken: true,
            }
        );
        printTokens(nativeOnly);

        // 示例 4: 不包含价格信息（更快的响应）
        console.log('📊 示例 4: 不包含价格信息（更快的响应）');
        console.log('-'.repeat(100));
        const noPrices = await getTokensByAddress(
            [
                {
                    address: vitalikAddress,
                    networks: ['eth-mainnet'],
                },
            ],
            {
                includePrices: false,
            }
        );
        printTokens(noPrices);

        // 示例 5: 查询多个地址
        console.log('📊 示例 5: 查询多个地址');
        console.log('-'.repeat(100));
        const multiAddress = await getTokensByAddress([
            {
                address: vitalikAddress,
                networks: ['eth-mainnet'],
            },
            {
                address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
                networks: ['eth-mainnet'],
            },
        ]);
        printTokens(multiAddress);

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
    getTokensByAddress,
    formatTokenAmount,
    printTokens,
    TokensResponse,
    Token,
    TokenMetadata,
    AddressNetwork,
    Network,
};
