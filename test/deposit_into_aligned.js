import { createWalletClient, createPublicClient, http, parseAbi, parseEther } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { anvil } from 'viem/chains'
import { RPC_URL, BATCHER_PAYMENT_SERVICE_ADDR } from './constants.js'

const CHAIN = anvil

export async function depositIntoAligned(privateKey, valueEth = '0.1') {
  const account = privateKeyToAccount(privateKey)
  const publicClient = createPublicClient({ chain: CHAIN, transport: http(RPC_URL) })
  const walletClient = createWalletClient({ account, chain: CHAIN, transport: http(RPC_URL) })

  const hash = await walletClient.sendTransaction({
    to: BATCHER_PAYMENT_SERVICE_ADDR,
    value: parseEther(valueEth),
  })
  console.log('Tx hash:', hash)

  const receipt = await publicClient.waitForTransactionReceipt({ hash })
  console.log('Deposit status:', receipt.status)
  return { hash, receipt }
}

export async function readAlignedBalance(userAddress) {
  const publicClient = createPublicClient({ chain: CHAIN, transport: http(RPC_URL) })

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
