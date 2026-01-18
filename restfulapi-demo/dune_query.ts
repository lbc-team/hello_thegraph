import * as dotenv from 'dotenv';

// 加载环境变量
dotenv.config();

const DUNE_API_KEY = process.env.DUNE_API_KEY;
const BASE_URL = 'https://api.dune.com/api/v1';

// 定义类型接口
interface QueryParameter {
    [key: string]: string | number;
}

interface ExecuteQueryRequest {
    query_parameters?: QueryParameter;
    performance?: 'medium' | 'large';
}

interface ExecuteQueryResponse {
    execution_id: string;
    state: string;
}

interface ExecutionResultMetadata {
    column_names: string[];
    column_types: string[];
    datapoint_count: number;
    execution_time_millis: number;
    pending_time_millis: number;
    result_set_bytes: number;
    row_count: number;
    total_result_set_bytes: number;
    total_row_count: number;
}

interface ExecutionResult {
    metadata: ExecutionResultMetadata;
    rows: any[];
    update_type?: string;
}

interface ExecutionResultResponse {
    execution_id: string;
    query_id: number;
    is_execution_finished: boolean;
    state: string;
    submitted_at: string;
    execution_started_at?: string;
    execution_ended_at?: string;
    expires_at?: string;
    cancelled_at?: string;
    result?: ExecutionResult;
    error?: {
        message: string;
        type: string;
        metadata?: any;
    };
    next_offset?: number;
    next_uri?: string;
}

/**
 * 执行查询
 * @param queryId 查询 ID，可以从 Dune 查询 URL 中获取
 * @param parameters 可选的查询参数，用于参数化查询
 * @param performance 性能级别：'medium' 或 'large'，默认为 'medium'
 */
async function executeQuery(
    queryId: number,
    parameters?: QueryParameter,
    performance: 'medium' | 'large' = 'medium'
): Promise<ExecuteQueryResponse> {
    const url = `${BASE_URL}/query/${queryId}/execute`;

    const body: ExecuteQueryRequest = {
        performance,
    };

    if (parameters) {
        body.query_parameters = parameters;
    }

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'X-Dune-API-Key': DUNE_API_KEY!,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`执行查询失败: ${response.status} ${response.statusText}\n${errorText}`);
    }

    return (await response.json()) as ExecuteQueryResponse;
}

/**
 * 获取执行结果
 * @param executionId 执行 ID，由 executeQuery 返回
 * @param options 可选参数
 */
async function getExecutionResult(
    executionId: string,
    options?: {
        limit?: number;
        offset?: number;
        columns?: string[];
        filters?: string;
        allowPartialResults?: boolean;
    }
): Promise<ExecutionResultResponse> {
    const url = new URL(`${BASE_URL}/execution/${executionId}/results`);

    // 添加查询参数
    if (options?.limit) {
        url.searchParams.append('limit', options.limit.toString());
    }
    if (options?.offset) {
        url.searchParams.append('offset', options.offset.toString());
    }
    if (options?.columns && options.columns.length > 0) {
        url.searchParams.append('columns', options.columns.join(','));
    }
    if (options?.filters) {
        url.searchParams.append('filters', options.filters);
    }
    if (options?.allowPartialResults) {
        url.searchParams.append('allow_partial_results', 'true');
    }

    const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
            'X-Dune-API-Key': DUNE_API_KEY!,
        },
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`获取结果失败: ${response.status} ${response.statusText}\n${errorText}`);
    }

    return (await response.json()) as ExecutionResultResponse;
}

/**
 * 轮询等待查询完成
 * @param executionId 执行 ID
 * @param maxWaitTime 最大等待时间（毫秒），默认 5 分钟
 * @param pollInterval 轮询间隔（毫秒），默认 2 秒
 */
async function waitForQueryCompletion(
    executionId: string,
    maxWaitTime: number = 300000, // 5 分钟
    pollInterval: number = 2000 // 2 秒
): Promise<ExecutionResultResponse> {
    const startTime = Date.now();

    while (Date.now() - startTime < maxWaitTime) {
        const result = await getExecutionResult(executionId);

        console.log(`查询状态: ${result.state}`);

        if (result.is_execution_finished) {
            if (result.error) {
                throw new Error(`查询执行出错: ${result.error.message}`);
            }
            return result;
        }

        // 等待下一次轮询
        await new Promise((resolve) => setTimeout(resolve, pollInterval));
    }

    throw new Error(`查询超时: 等待时间超过 ${maxWaitTime / 1000} 秒`);
}

/**
 * 执行查询并等待结果（一站式方法）
 * @param queryId 查询 ID
 * @param parameters 可选的查询参数
 * @param performance 性能级别
 */
async function runQuery(
    queryId: number,
    parameters?: QueryParameter,
    performance: 'medium' | 'large' = 'medium'
): Promise<ExecutionResultResponse> {
    console.log(`🚀 开始执行查询 ID: ${queryId}`);

    // 1. 执行查询
    const execution = await executeQuery(queryId, parameters, performance);
    console.log(`✅ 查询已提交，执行 ID: ${execution.execution_id}`);

    // 2. 等待结果
    const result = await waitForQueryCompletion(execution.execution_id);
    console.log(`✅ 查询完成！`);

    return result;
}

/**
 * 打印查询结果
 */
function printQueryResult(result: ExecutionResultResponse) {
    console.log(`\n${'='.repeat(100)}`);
    console.log(`查询结果摘要`);
    console.log(`${'='.repeat(100)}`);
    console.log(`执行 ID: ${result.execution_id}`);
    console.log(`查询 ID: ${result.query_id}`);
    console.log(`状态: ${result.state}`);
    console.log(`提交时间: ${result.submitted_at}`);

    if (result.execution_started_at) {
        console.log(`开始时间: ${result.execution_started_at}`);
    }
    if (result.execution_ended_at) {
        console.log(`结束时间: ${result.execution_ended_at}`);
    }

    if (result.result) {
        console.log(`\n结果元数据:`);
        console.log(`  - 行数: ${result.result.metadata.row_count} / ${result.result.metadata.total_row_count}`);
        console.log(`  - 列数: ${result.result.metadata.column_names.length}`);
        console.log(`  - 数据点数: ${result.result.metadata.datapoint_count}`);
        console.log(`  - 执行时间: ${result.result.metadata.execution_time_millis} ms`);
        console.log(`  - 等待时间: ${result.result.metadata.pending_time_millis} ms`);

        console.log(`\n列名: ${result.result.metadata.column_names.join(', ')}`);
        console.log(`列类型: ${result.result.metadata.column_types.join(', ')}`);

        console.log(`\n查询结果 (前 10 行):`);
        console.log(`${'-'.repeat(100)}`);

        const displayRows = result.result.rows.slice(0, 10);
        displayRows.forEach((row, index) => {
            console.log(`\n行 ${index + 1}:`);
            console.log(JSON.stringify(row, null, 2));
        });

        if (result.result.rows.length > 10) {
            console.log(`\n... 还有 ${result.result.rows.length - 10} 行未显示`);
        }
    }

    if (result.error) {
        console.log(`\n❌ 错误:`);
        console.log(`  类型: ${result.error.type}`);
        console.log(`  消息: ${result.error.message}`);
        if (result.error.metadata) {
            console.log(`  详情: ${JSON.stringify(result.error.metadata)}`);
        }
    }

    if (result.next_uri) {
        console.log(`\n分页: 存在更多结果`);
        console.log(`  下一页偏移: ${result.next_offset}`);
        console.log(`  下一页 URI: ${result.next_uri}`);
    }

    console.log(`\n${'='.repeat(100)}\n`);
}

// ============================================
// 演示示例
// ============================================

async function demo() {
    try {
        // 示例 1: 执行一个公开查询
        // 这是一个示例查询 ID，你需要替换为你自己的查询 ID
        // 你可以从 Dune 网站的查询 URL 中获取查询 ID
        // 例如: https://dune.com/queries/1234567 中的 1234567
        const queryId = 3389838; // 示例查询 ID

        console.log('🚀 Dune Query API 演示\n');

        // 示例 1: 简单查询（无参数）
        console.log('📊 示例 1: 执行简单查询');
        console.log('-'.repeat(100));
        const simpleResult = await runQuery(queryId);
        printQueryResult(simpleResult);

        // 示例 2: 带参数的查询
        // 如果你的查询有参数，可以使用以下方式
        /*
        console.log('📊 示例 2: 执行带参数的查询');
        console.log('-'.repeat(100));
        const params = {
            blockchain: 'ethereum',
            limit: 100,
        };
        const paramResult = await runQuery(queryId, params);
        printQueryResult(paramResult);
        */

        // 示例 3: 使用高性能执行
        /*
        console.log('📊 示例 3: 使用大型性能级别');
        console.log('-'.repeat(100));
        const largeResult = await runQuery(queryId, undefined, 'large');
        printQueryResult(largeResult);
        */

        // 示例 4: 分页获取结果
        /*
        console.log('📊 示例 4: 分页获取结果');
        console.log('-'.repeat(100));
        const execution = await executeQuery(queryId);
        const firstPage = await getExecutionResult(execution.execution_id, { limit: 100 });
        printQueryResult(firstPage);

        if (firstPage.next_offset) {
            const secondPage = await getExecutionResult(execution.execution_id, {
                limit: 100,
                offset: firstPage.next_offset,
            });
            printQueryResult(secondPage);
        }
        */

        // 示例 5: 只获取特定列
        /*
        console.log('📊 示例 5: 只获取特定列');
        console.log('-'.repeat(100));
        const execution = await executeQuery(queryId);
        await waitForQueryCompletion(execution.execution_id);
        const columnResult = await getExecutionResult(execution.execution_id, {
            columns: ['column1', 'column2'], // 替换为实际的列名
        });
        printQueryResult(columnResult);
        */

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
    executeQuery,
    getExecutionResult,
    waitForQueryCompletion,
    runQuery,
    printQueryResult,
    ExecuteQueryResponse,
    ExecutionResultResponse,
    QueryParameter,
};
