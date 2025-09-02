import React, { useCallback, useEffect } from "react";
import { Address } from "viem";
import {
  useChainId,
  useReadContract,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";
import { useToast } from "../state/toast";
import { zkArcadeNftAbi } from "../constants/aligned";

type HookArgs = {
    userAddress: Address;
    contractAddress: Address;
    tokenURI: string;
    proof: `0x${string}`[] | `0x${string}` | string;
};

// This function normalizes the proof input into an array of bytes32 strings.
function processRawMerkleProof(input: HookArgs["proof"]): `0x${string}`[] {
    if (Array.isArray(input)) {
        return input as `0x${string}`[];
    }

    if (typeof input === "string") {
        const trimmed = input.trim();
        if (!trimmed) throw new Error("Proof is empty");

        // Remove all 0x internal prefixes
        const hex = trimmed.replace(/0x/gi, "");
        
        if (hex.length % 64 !== 0) {
            throw new Error("Invalid length for concatenated bytes32");
        }

        // Gets each bytes32 chunk and pushes it into the vec
        const result: `0x${string}`[] = [];
        for (let i = 0; i < hex.length; i += 64) {
            result.push(`0x${hex.slice(i, i + 64)}` as `0x${string}`);
        }
        return result;
    }

    throw new Error("Unsupported proof format");
}

export function useNftContract({ userAddress, contractAddress, tokenURI, proof }: HookArgs) {
    const chainId = useChainId();
    const { addToast } = useToast();

    const balance = useReadContract({
        address: contractAddress,
        abi: zkArcadeNftAbi,
        functionName: "balanceOf",
        args: userAddress ? [userAddress] : undefined,
        chainId,
    });

    const { writeContractAsync, data: txHash, ...txRest } = useWriteContract();
    const receipt = useWaitForTransactionReceipt({ hash: txHash });

    const claimNft = useCallback(async () => {
        if (!userAddress) throw new Error("Wallet not connected");

        let merkleProofArray: `0x${string}`[];
        try {
            merkleProofArray = processRawMerkleProof(proof);
        } catch (e: any) {
            addToast({ title: "Invalid merkle proof", desc: String(e?.message || e), type: "error" });
            return;
        }

        const hash = await writeContractAsync({
            address: contractAddress,
            abi: zkArcadeNftAbi,
            functionName: "claimNFT",
            args: [merkleProofArray, tokenURI],
            account: userAddress,
            chainId,
        });

        addToast({
            title: "Transaction sent. You should see your NFT in your wallet soon.",
            desc: `Tx: ${hash.slice(0, 10)}…`,
            type: "success",
        });

        return hash;
    }, [userAddress, proof, tokenURI, contractAddress, writeContractAsync, chainId, addToast]);

    useEffect(() => {
        if (txRest.isError) {
            addToast({
                title: "Claim failed",
                desc: txRest.error ? String(txRest.error.message || txRest.error) : "Transaction failed.",
                type: "error",
            });
        }
    }, [txRest.isSuccess, txRest.isError]);

    useEffect(() => {
        if (receipt.isError) {
            addToast({
                title: "Receipt error",
                desc: "Could not retrieve transaction receipt.",
                type: "error",
            });
        }
        if (receipt.isSuccess) {
            addToast({
                title: "NFT minted",
                desc: "Your claim has been confirmed on-chain, you should see your NFT in your wallet shortly.",
                type: "success",
            });
        }
    }, [receipt.isLoading, receipt.isError, receipt.isSuccess]);

    const balanceMoreThanZero = (balance.data && balance.data > 0n) || false;

    return {
        balance,
        claimNft,
        receipt,
        tx: { hash: txHash, ...txRest },
        disabled: !userAddress || balanceMoreThanZero,
    };
}
