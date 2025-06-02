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