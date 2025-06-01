'use client';

import { useState, useEffect } from 'react';
import { 
  useAccount, 
  useConnect, 
  useDisconnect, 
  useChainId, 
  useChains, 
  useReadContract, 
  useWriteContract,
  useClient,
  useBalance
} from 'wagmi';
import { injected } from 'wagmi/connectors';
import TOKEN_ABI from './contracts/OPS_TOKEN.json';
import { parseUnits, formatUnits } from 'viem';
import { useQuery } from '@tanstack/react-query';
import { GraphQLClient, gql } from 'graphql-request';

// Counter 合约地址
const OPS_TOKEN_ADDRESS = "0x3DFcc1C8bd62EC42513E1424945546D447Ef3A2E";

export default function Home() {
  const { address: addr, isConnected } = useAccount();
  const { connect } = useConnect();
  const { disconnect } = useDisconnect();
  const chainId = useChainId();
  const chains = useChains();
  const currentChain = chains.find(chain => chain.id === chainId);

  // 使用 useBalance 获取余额
  const { data: balance } = useBalance({
    address: addr,
  });

  // 使用 useReadContract 读取合约数据
  const { data: tokenBalance } = useReadContract({
    address: OPS_TOKEN_ADDRESS as `0x${string}`,
    abi: TOKEN_ABI,
    functionName: 'balanceOf',
    args: [addr],
  });

  // 使用 useWriteContract 写入合约数据
  const { 
    writeContract,
    isPending,
    data: hash,
    isSuccess,
    isError,
    error
  } = useWriteContract();

  // 新增：ERC20转账表单状态
  const [toAddress, setToAddress] = useState('');
  const [amount, setAmount] = useState('');
  const [txStatus, setTxStatus] = useState('');

  // Token symbol（假设为OPS）
  const tokenSymbol = 'OPS';
  // 格式化Token余额
  let formattedTokenBalance = '0';
  if (typeof tokenBalance === 'bigint') {
    try {
      formattedTokenBalance = parseFloat(formatUnits(tokenBalance, 18)).toFixed(4);
    } catch {
      formattedTokenBalance = tokenBalance?.toString();
    }
  } else if (tokenBalance) {
    formattedTokenBalance = tokenBalance?.toString();
  }

  // 新增：转账记录查询
  const fetchRecords = async (addr: string) => {
    const lowerAddr = addr.toLowerCase();
    // 一个带参数的 GraphQL 查询 ， 查询 20 条转账记录， 按时间排序， 按 from 和 to 查询
    // transfersIn transfersOut 是两个查询的别名

    const query = gql`
      query GetTransfers($addr: String!) {
        transfersIn: transfers(where: {to: $addr}, orderBy: blockTimestamp, orderDirection: desc, first: 20) {
          id from to value transactionHash blockTimestamp
        }
        transfersOut: transfers(where: {from: $addr}, orderBy: blockTimestamp, orderDirection: desc, first: 20) {
          id from to value transactionHash blockTimestamp
        }
      }
    `;
    const client = new GraphQLClient('https://api.studio.thegraph.com/query/112571/ops-token/version/latest');
    const res = await client.request(query, { addr: lowerAddr });
    let all = [...(res.transfersIn || []), ...(res.transfersOut || [])];
    all = all.filter((v, i, arr) => arr.findIndex(x => x.id === v.id) === i);
    all.sort((a, b) => Number(b.blockTimestamp) - Number(a.blockTimestamp));
    return all;
  };

  const {
    data: records = [],
    isLoading: loadingRecords,
  } = useQuery({
    queryKey: ['transfers', addr],
    queryFn: () => addr ? fetchRecords(addr) : Promise.resolve([]),
    enabled: !!addr,
  });

  // 切换网络函数
  const handleSwitchChain = async (chainIdHex: string) => {
    if (window.ethereum) {
      try {
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: chainIdHex }],
        });
      } catch (switchError: any) {
        // 如果没有该链，则尝试添加
        if (switchError.code === 4902) {
          setTxStatus('钱包未添加该网络，请手动添加');
        } else {
          setTxStatus('切换网络失败: ' + switchError.message);
        }
      }
    }
  };

  // ERC20转账处理函数
  const handleTransfer = async () => {
    setTxStatus('');
    if (!toAddress || !amount) {
      setTxStatus('请输入接收地址和数量');
      return;
    }
    try {
      // 假设token为18位小数
      const value = parseUnits(amount, 18);
      writeContract({
        address: OPS_TOKEN_ADDRESS as `0x${string}`,
        abi: TOKEN_ABI,
        functionName: 'transfer',
        args: [toAddress, value],
      });
      setTxStatus('交易已提交，请等待确认...');
    } catch (e: any) {
      setTxStatus('转账失败: ' + e.message);
    }
  };

  // 监听交易状态
  useEffect(() => {
    if (isSuccess) {
      setTxStatus('转账成功！');
    } else if (isError) {
      setTxStatus('转账失败: ' + (error?.message || '未知错误'));
    }
  }, [isSuccess, isError, error]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8">
      <h1 className="text-3xl font-bold mb-8">TheGraph Query Demo</h1>
      
      <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-2xl">
        {!isConnected ? (
          <button
            onClick={() => connect({ connector: injected() })}
            className="w-full bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600 transition-colors"
          >
            连接 MetaMask
          </button>
        ) : (
          <div className="space-y-4">
            {/* 钱包地址和断开按钮同一行 */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600">钱包地址:</p>
                <p className="font-mono break-all">{addr}</p>
              </div>
              <button
                onClick={() => disconnect()}
                className="ml-4 bg-red-500 text-white py-2 px-4 rounded hover:bg-red-600 transition-colors"
              >
                断开连接
              </button>
            </div>
            {/* 当前网络与切换网络同一行 */}
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <p className="text-gray-600">当前网络:</p>
                <p className="font-mono">
                  {currentChain?.name || '未知网络'} (Chain ID: {chainId})
                </p>
              </div>
              <div className="flex flex-wrap gap-2 items-center">
                <span className="text-gray-600">切换网络:</span>
                {chains.map(chain => (
                  <button
                    key={chain.id}
                    onClick={() => handleSwitchChain('0x' + chain.id.toString(16))}
                    className={`py-1 px-3 rounded border ${chain.id === chainId ? 'bg-gray-300' : 'bg-blue-100 hover:bg-blue-300'}`}
                    disabled={chain.id === chainId}
                  >
                    {chain.name}
                  </button>
                ))}
              </div>
            </div>
            {/* ETH余额和Token余额同一行 */}
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="text-center flex-1">
                <p className="text-gray-600">ETH 余额:</p>
                <p className="font-mono">
                  {balance?.formatted || '0'} {balance?.symbol}
                </p>
              </div>
              <div className="text-center flex-1">
                <p className="text-gray-600">Token 余额:</p>
                <p className="font-mono">{formattedTokenBalance} {tokenSymbol}</p>
              </div>
            </div>
            {/* ERC20转账表单 */}
            <div className="text-center border-t pt-4 mt-4">
              <p className="text-gray-600 mb-2">ERC20 转账</p>
              <div className="flex flex-row gap-2 items-center justify-center">
                <input
                  type="text"
                  placeholder="接收地址"
                  value={toAddress}
                  onChange={e => setToAddress(e.target.value)}
                  className="flex-1 min-w-0 px-2 py-1 border rounded"
                />
                <input
                  type="text"
                  placeholder="数量（如 1.5）"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  className="w-28 px-2 py-1 border rounded"
                />
                <button
                  onClick={handleTransfer}
                  className="bg-green-500 text-white py-2 px-4 rounded hover:bg-green-600 transition-colors"
                  disabled={isPending}
                >
                  {isPending ? '转账中...' : '转账'}
                </button>
              </div>
              {txStatus && <p className="text-sm text-blue-600 mt-2">{txStatus}</p>}
            </div>
            {/* 转账记录表格 */}
            <div className="mt-6">
              <p className="text-gray-600 mb-2 text-left">转账记录（最近20条）</p>
              {loadingRecords ? (
                <p className="text-gray-400">加载中...</p>
              ) : records.length === 0 ? (
                <p className="text-gray-400">暂无记录</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm border">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="px-2 py-1 border">时间</th>
                        <th className="px-2 py-1 border">类型</th>
                        <th className="px-2 py-1 border">From</th>
                        <th className="px-2 py-1 border">To</th>
                        <th className="px-2 py-1 border">数量</th>
                        <th className="px-2 py-1 border">TxHash</th>
                      </tr>
                    </thead>
                    <tbody>
                      {records.map((rec: any) => (
                        <tr key={rec.id} className="border-b">
                          <td className="px-2 py-1 border">{new Date(Number(rec.blockTimestamp) * 1000).toLocaleString()}</td>
                          <td className="px-2 py-1 border">{rec.to.toLowerCase() === addr?.toLowerCase() ? '转入' : '转出'}</td>
                          <td className="px-2 py-1 border font-mono break-all">{rec.from}</td>
                          <td className="px-2 py-1 border font-mono break-all">{rec.to}</td>
                          <td className="px-2 py-1 border">{parseFloat(formatUnits(BigInt(rec.value), 18)).toFixed(4)}</td>
                          <td className="px-2 py-1 border font-mono break-all">
                            <a href={`https://sepolia.etherscan.io/tx/${rec.transactionHash}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">{rec.transactionHash.slice(0, 10)}...</a>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
