import { createWalletClient, createPublicClient, http, parseAbi, parseEther } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'

import { RPC_URL, BATCHER_PAYMENT_SERVICE_ADDR, USED_CHAIN } from './constants.js'

export async function depositIntoAligned(privateKey, valueEth = '0.1') {
  const account = privateKeyToAccount(privateKey)
  const publicClient = createPublicClient({ chain: USED_CHAIN, transport: http(RPC_URL) })
  const walletClient = createWalletClient({ account, chain: USED_CHAIN, transport: http(RPC_URL) })

  const hash = await walletClient.sendTransaction({
    to: BATCHER_PAYMENT_SERVICE_ADDR,
    value: parseEther(valueEth),
  })

  const receipt = await publicClient.waitForTransactionReceipt({ hash })

  return { hash, receipt }
}

export async function readAlignedBalance(userAddress) {
  const publicClient = createPublicClient({ chain: USED_CHAIN, transport: http(RPC_URL) })

  const abi = parseAbi([
    'function user_balances(address account) view returns (uint256)'
  ])

  const balance = await publicClient.readContract({
    address: BATCHER_PAYMENT_SERVICE_ADDR,
    abi,
    functionName: 'user_balances',
    args: [userAddress],
  })

  return balance
}
