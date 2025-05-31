# Simple TheGraph Demo

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).


通过: `npx create-next-app@latest simple-front`

这是一个使用 Viem 和 Wagmi 构建的简单以太坊应用前端示例。该应用展示了如何与智能合约进行交互，包括读取和写入操作。

参考：[Viem 和 Wagmi 教程](https://github.com/lbc-team/hello_viem) 

前端展示链接 TheGraph 数据

## 使用方法

1. 克隆仓库
2. 安装依赖：
```bash
# 使用 pnpm 安装依赖
pnpm install
```
3. 启动开发服务器：
```bash
pnpm dev
```

4. 在浏览器中访问 `http://localhost:3000` 或 `http://localhost:3000/appkit-demo`
 


## 项目结构

```
query-front/
├── app/
│   ├── layout.tsx      # 根布局组件
│   ├── page.tsx        # 主页面组件
│   ├── providers.tsx   # Wagmi Provider 配置
│   └── globals.css     # 全局样式
├── public/             # 静态资源
└── package.json        # 项目配置
```

## 注意事项

1. 确保已安装 MetaMask 浏览器扩展
2. 确保 MetaMask 已连接到以太坊网络
3. 首次使用需要授权连接钱包


## 开发环境要求

- Node.js 22.0.0 或更高版本
- pnpm 包管理器
- MetaMask 钱包扩展

 
## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.


## 查询
文档：
https://thegraph.com/docs/zh/querying/graphql-api/

按余额查询：
```
{
  users(orderBy: balance orderDirection:desc) {
    id
    balance
  }
}
```

按用户查询查询：
{
  users(where:{id: "0xe74c813e3f545122e88a72fb1df94052f93b808f" }) {
    id
    balance
  }
}



## GraphQL

https://graphql.org/swapi-graphql

```
{
	allFilms {
    films {
      title,
      releaseDate
      ,episodeID
    }
  }
}

```

```
{
  film (filmID: 1) {
          title,
      releaseDate
  }
}
```
