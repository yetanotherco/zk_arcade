import React, { useCallback, useEffect } from "react";

import type { Address } from "viem";
import { useNftContract } from "../../hooks/useNftContract";
import Web3EthProvider from "../../providers/web3-eth-provider";
import { ToastContainer } from "../../components/Toast";
import { ToastsProvider } from "../../state/toast";
import { Button } from "../../components/Button";

type ClaimNFTButtonProps = {
    network: string;
    contract_address: Address;
    user_address: Address;
    tokenURI: string;
    merkle_proof: `0x${string}`[] | `0x${string}` | string;
    merkle_root_index: number;
};

const ClaimLogic = ({
    contract_address,
    user_address,
    tokenURI,
    merkle_proof,
    merkle_root_index,
}: Omit<ClaimNFTButtonProps, "network">) => {
    const { balance, claimNft, receipt, tx, disabled } = useNftContract({
        userAddress: user_address,
        contractAddress: contract_address,
        tokenURI,
        proof: merkle_proof,
        merkleRootIndex: merkle_root_index,
    });

    const userHasClaimed = ((balance.data as bigint | undefined) ?? 0n) > 0n;

    return (
        <div className="flex flex-col gap-2">
            <div>
                {userHasClaimed ?(
                    <p>You have already claimed your NFT! You can now play games and submit your solutions to the leaderboard.</p>
                ) : (
                    <div>
                        {merkle_proof.length > 0 ? (
                            <p>You are eligible to claim your NFT! Claim it using the button below:</p>
                        ) : (
                            <p>You are not eligible to claim this NFT.</p>
                        )}
                    </div>
                )}

                <Button
                    variant="accent-fill"
                    disabled={disabled || merkle_proof.length === 0}
                    onClick={() => claimNft()}
                    className="mt-4"
                >
                    {balance.isFetching
                    ? "Reading…"
                    : tx.isPending
                    ? "Sending…"
                    : receipt.isLoading
                    ? "Confirming…"
                    : "Claim NFT"}
                </Button>
            </div>
        </div>
    );
};

export const ClaimNft = ({
    network,
    contract_address,
    user_address,
    tokenURI,
    merkle_proof,
    merkle_root_index,
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
                    merkle_root_index={merkle_root_index}
                />
            </ToastsProvider>
        </Web3EthProvider>
    );
};

