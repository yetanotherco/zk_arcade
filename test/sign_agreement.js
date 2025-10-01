import { privateKeyToAccount } from 'viem/accounts'

export default async function signMessageFromPrivateKey(privateKey) {
  const account = privateKeyToAccount(privateKey)

  console.log("Signing message with account:", account)

    const signature = await account.signMessage({
    message: "I agree with the service policy",
    });

  return signature;
}

