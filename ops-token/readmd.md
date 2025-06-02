# TheGraph 开发步骤


## 前置条件

先部署 Token 到测试网络，最好合约代码已开源验证

这里使用： [0x3DFcc1C8bd62EC42513E1424945546D447Ef3A2E](https://sepolia.etherscan.io/token/0x3dfcc1c8bd62ec42513e1424945546d447ef3a2e)


## 在 thegraph studio 注册项目

进入 https://thegraph.com/studio/ ， 创建项目。

## 安装 Graph CLI#
```
pnpm add -g @graphprotocol/graph-cli
```

## TheGraph 工程初始化

```
graph init ops-token

这时会有一系列提示：
> network: 选择网络
> Contract: 0x3DFcc1C8bd62EC42513E1424945546D447Ef3A2E
> Start Block: 8423553
```


生成的目录结构：

```
subgraph.yaml : Manifest 清单， 工程配置
schema.graphql: Schema 模式, 定义索引的主体， 类似定义MySQL 表结构
src/ops-token.ts: 自定义编写索引规则 
```

接下就就是修改代码，编写自己的子图。


## subgraph.yaml
在初始化项目时，填写的一系列配置会写入到 `subgraph.yaml` 中,  `subgraph.yaml` 会定义：


* 要索引哪些智能合约(地址，网络，ABI...)
* 监听哪些事件
* 其他要监听的内容，例如函数调用或块
* 被调用的映射函数，在那个文件

## schema.graphql

定义好实体后运行

```
graph codegen
```

会帮我们生成实体类，再去编写映射规则。



## 编写映射（事件处理代码）

src/ops-token.ts

graph-ts

参考 assemblyscript-api 


```
graph build
```


## 发布

```
graph auth <your deploy key>
```

deploy key 可以在 https://thegraph.com/studio 的 dashboard 拿到

```
graph deploy ops-token
```

ops-token 替换为你自己的工程名字。TheGraph 会将代码发布到 IPFS。
成功发布之后，我们可以看到一个查询的节点，类似：https://api.studio.thegraph.com/query/112571/ops-token/v0.0.1



TheGraph 网络会帮我们索引数据， 等待一会，就可以开始查询了。
 


TheGraph 控制台提供了一个 Playground , 方便我们测试查询：
![](https://img.learnblockchain.cn/pics/20250528183312.png)


https://thegraph.com/studio/subgraph/ops-token/playground

```
{
  transfers(first: 5) {
    id
    from
    to
    value
  }
  users(first: 5) {
    id
    balance
  }
}
```

测试通过之后， 就可以正式在 thegraph 上发布
![](https://img.learnblockchain.cn/pics/20250528183122.png)

