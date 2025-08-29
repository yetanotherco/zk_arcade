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
};

const ClaimLogic = ({
    contract_address,
    user_address,
    tokenURI,
    merkle_proof,
}: Omit<ClaimNFTButtonProps, "network">) => {
    const { balance, userInWhitelist, claimNft, receipt, tx, disabled } = useNftContract({
        userAddress: user_address,
        contractAddress: contract_address,
        tokenURI,
        proof: merkle_proof,
    });

    const userHasClaimed = ((balance.data as bigint | undefined) ?? 0n) > 0n;

    return (
        <div className="flex flex-col gap-2">
            {userInWhitelist ? (
                <div>
                    {userHasClaimed ?(
                        <div>
                            <p>You have already claimed your NFT! You can now play games and submit your solutions to the leaderboard.</p>
                        </div>
                    ) : (
                        <div>
                            <p>You are eligible to claim your NFT! Claim it using the button below:</p>
                        </div>
                    )}

                    <div className="flex justify-center">
                        <Button
                            variant="accent-fill"
                            disabled={disabled}
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
            ) : (
                <div>
                    You aren’t whitelisted!
                </div>
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

