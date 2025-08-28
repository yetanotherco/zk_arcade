import React, { useCallback, useEffect } from "react";

import type { Address } from "viem";
import { useNftContract } from "../../hooks/useNftContract";
import Web3EthProvider from "../../providers/web3-eth-provider";
import { ToastContainer } from "../../components/Toast";
import { ToastsProvider } from "../../state/toast";

type ClaimNFTButtonProps = {
    network: string;
    contract_address: Address;
    user_address: Address;
    tokenURI: string;
    merkle_proof: `0x${string}`[] | `0x${string}` | string;
};

const ClaimLogic = ({
    contract_address,
    user_address,
    tokenURI,
    merkle_proof,
}: Omit<ClaimNFTButtonProps, "network">) => {

    const { balance, whitelist, claimNft, receipt, tx, disabled } = useNftContract({
        userAddress: user_address,
        contractAddress: contract_address,
        tokenURI,
        proof: merkle_proof,
    });
    const alreadyHas = (balance.data as bigint | undefined) ?? 0n;

    return (
        <div className="flex flex-col gap-2 max-w-sm">
        <div className="text-sm">
            Whitelist: {whitelist.isFetching ? "…" : whitelist.data ? "Yes" : "No"}
        </div>
        <div className="text-sm">Balance: {balance.isFetching ? "…" : alreadyHas.toString()}</div>
        <button
            disabled={disabled}
            onClick={() => claimNft()}
            className={`rounded-2xl px-4 py-2 border shadow ${disabled ? "opacity-60 cursor-not-allowed" : "hover:shadow-md"}`}
            title={"Configure a valid tokenURI"}
        >
            {balance.isFetching
            ? "Reading…"
            : tx.isPending
            ? "Sending…"
            : receipt.isLoading
            ? "Confirming…"
            : "Claim NFT"}
        </button>
        {tx.hash && (
            <div className="text-xs font-mono break-all">tx: {tx.hash}</div>
        )}
        </div>
    );
};

export const ClaimNft = ({
    network,
    contract_address,
    user_address,
    tokenURI,
    merkle_proof,
}: ClaimNFTButtonProps) => {
    return (
        <Web3EthProvider network={network}>
            <ToastsProvider>
                <ToastContainer />
                <ClaimLogic
                    contract_address={contract_address}
                    user_address={user_address}
                    tokenURI={tokenURI}
                    merkle_proof={merkle_proof}
                />
            </ToastsProvider>
        </Web3EthProvider>
    );
};

