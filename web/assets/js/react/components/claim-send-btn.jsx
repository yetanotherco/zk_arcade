import React, { useEffect } from "react";
import { useSimulateContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import ClaimableAirdrop from "../../contracts/ClaimableAirdrop.json";
import { TwitterShareBtn } from "./twitter-share-btn";

const get_etherscan_href = (network, tx_hash) => {
  switch (network) {
    case 'mainnet':
      return `https://etherscan.io/tx/${tx_hash}`;
    case 'sepolia':
      return `https://sepolia.etherscan.io/tx/${tx_hash}`;
    case 'anvil':
      return `https://anvil.etherscan.io/tx/${tx_hash}`;
    default:
      return "";
  }
}

const LoadingDot = () =>
  <div className="relative flex items-center justify-center mr-2">
    <div className="w-4 h-4 bg-green-400 rounded-full"></div>
    <div className="w-4 h-4 bg-green-400 rounded-full absolute top-0 left-0 animate-ping"></div>
    <div className="w-4 h-4 bg-green-400 rounded-full absolute top-0 left-0 animate-pulse"></div>
  </div>

const ClaimSendBtn = ({ merkle_proof, amount, proxy_contract_address, network }) => {
  const claim_args = {
    abi: ClaimableAirdrop.abi,
    address: proxy_contract_address,
    functionName: "claim",
    args: [amount, merkle_proof.split(",")],
  }

  const {
    error: simulateContractError,
    isError: isSimulateError,
    isSuccess: isSimulateSuccess,
    isLoading: isSimulateLoading } = useSimulateContract(claim_args);


  const {
    data: WriteData,
    error: writeError,
    isPending: isWritePending,
    isError: isWriteError,
    isSuccess: isWriteSuccess,
    writeContract } = useWriteContract();

  const {
    data: receiptData,
    error: receiptError,
    isError: isReceiptError,
    isSuccess: isReceiptSuccess,
    isPending: isReceiptPending,
  } = useWaitForTransactionReceipt({ hash: WriteData });

  const handleClaim = async () => {
    writeContract(claim_args)
  };

  return (
    <>
      {isSimulateLoading &&
        <div className="flex items-center py-2">
          < LoadingDot />
          <span>Preparing claiming process</span>
        </div>}

      {isSimulateSuccess && !isWriteSuccess &&
        <>
          <p className="text-green-400 font-semibold py-2">Your tokens are waiting to be claimed!</p>
          <button className="flex items-center default-btn" onClick={handleClaim} disabled={isWritePending}>
            {isWritePending
              ? <>< LoadingDot /> <span>Waiting Wallet ...</span></>
              : "Claim"}
          </button>
        </>}

      {isWriteSuccess &&
        <div>
          <p className="mt-4">Your claiming is being processed</p>
          <p className="mt-2">Transaction hash:
            <a className="underline text-green-500 hover:text-green-600"
              href={get_etherscan_href(network, WriteData)}>
              {WriteData}
            </a>
          </p>
          <div className="mt-6">
            {isReceiptPending &&
              <div className="flex items-center">
                < LoadingDot />
                <span>Waiting for Transaction confirmation ....</span>
              </div>}

            {isReceiptSuccess && receiptData?.status === "success" &&
              <>
                <p className="text-green-400 font-semibold mt-6">
                  The Claiming process succeeded.
                </p>
                <p className="mt-6">Check your wallet!</p>
                <div className="mt-6">
                  <TwitterShareBtn amount={amount} />
                </div>

              </>}

            {isReceiptSuccess && receiptData?.status === "failed" &&
              <>
                <p className="text-red-400 font-semibold mt-6">
                  The Claiming process failed.
                </p>
                <p className="mt-6">Try again!</p>
              </>}

            {isReceiptError &&
              <>
                <p className="text-red-400 font-semibold mt-6">
                  The Claiming process failed.
                </p>
                <p className="mt-6">Try again!</p>
              </>}
          </div>
        </div>}

      {isSimulateError &&
        <div className="mt-2">
          <p className="text-red-400 font-semibold">{simulateContractError.shortMessage}</p>
        </div>}
    </>
  );
};

export default ClaimSendBtn;
