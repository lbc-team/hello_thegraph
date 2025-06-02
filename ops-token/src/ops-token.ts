import { Address, BigInt, ethereum, Bytes } from "@graphprotocol/graph-ts"

import {
  Transfer as TransferEvent
} from "../generated/OPS_TOKEN/OPS_TOKEN"
import { Transfer, User, BalanceSnapshot } from "../generated/schema"

const ADDRESS_ZERO = "0x0000000000000000000000000000000000000000"

export function handleTransfer(event: TransferEvent): void {
  let entity = new Transfer(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.from = event.params.from
  entity.to = event.params.to
  entity.value = event.params.value

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()

  // 更新用户余额
  updateUserBalance(event.params.from, event.params.to, event.params.value)

  // 创建快照
  createBalanceSnapshot(event.params.from, event.block)
  createBalanceSnapshot(event.params.to, event.block)

  // 获取用户余额
  // getUserBalanceByContract(event.params.from)

}

function updateUserBalance(from: Address, to: Address, amount: BigInt): void {
  if (from.toHex() != ADDRESS_ZERO) {
    let userFrom = User.load(from.toHex())
    if (!userFrom) {
        userFrom = new User(from.toHex())
        userFrom.balance = BigInt.fromI32(0)
    }

    userFrom.balance = userFrom.balance.minus(amount)
    userFrom.save()
  }


  if (to.toHex() != ADDRESS_ZERO) {
    let userTo = User.load(to.toHex())

    if (!userTo) {
      userTo = new User(to.toHex())
      userTo.balance = BigInt.fromI32(0)
    }

    userTo.balance = userTo.balance.plus(amount)
    userTo.save()
  }
}

function createBalanceSnapshot(userAddress: Address, block: ethereum.Block): void {
  if (userAddress.toHex() == ADDRESS_ZERO) {
    return
  }
  let user = User.load(userAddress.toHex())
  if (!user) {
    return
  }
  let snapshotId = userAddress.toHex() + "-" + block.number.toString()
  let snapshot = new BalanceSnapshot(snapshotId)
  snapshot.user = Bytes.fromHexString(userAddress.toHex())
  snapshot.balance = user.balance
  snapshot.blockNumber = block.number
  snapshot.blockTimestamp = block.timestamp
  snapshot.save()
}

// 另一种获取用户余额的思路：
// 可以通过绑定合约实例，直接调用合约的 balanceOf 方法获取指定区块的余额。例如：
// import { OPS_TOKEN } from "../generated/OPS_TOKEN/OPS_TOKEN"

// function getUserBalanceByContract(user: Address): BigInt {
//   // 绑定合约实例，传入合约地址和区块上下文
//   let contract = OPS_TOKEN.bind(Address.fromString("0x3DFcc1C8bd62EC42513E1424945546D447Ef3A2E"))
//   // 通过 try_balanceOf 查询余额（推荐使用 try_ 方法避免revert）
//   // 获取处理事件的区块高度的余额
//   let result = contract.try_balanceOf(user)
//   if (!result.reverted) {
//     return result.value
//   }
//   return BigInt.fromI32(0)
// }
