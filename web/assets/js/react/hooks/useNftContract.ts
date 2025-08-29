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

function normalizeBytes32Array(input: HookArgs["proof"]): `0x${string}`[] {
    const toBytes32 = (h: string): `0x${string}` => {
        if (!/^0x[0-9a-fA-F]{64}$/.test(h)) throw new Error(`Element is not bytes32: ${h}`);
        return h as `0x${string}`;
    };

    if (Array.isArray(input)) {
        return (input as string[]).map(toBytes32);
    }

    if (typeof input === "string") {
        const s = input.trim();
        if (!s) throw new Error("Proof is empty");

        if (/^0x[0-9a-fA-F]{64}$/.test(s)) return [s as `0x${string}`];

        const count0x = (s.match(/0x/gi) || []).length;
        if (count0x > 1) {
        return s
            .split(/0x/gi)
            .filter(Boolean)
            .map((h) => toBytes32(("0x" + h) as `0x${string}`));
        }

        const stripped = s.startsWith("0x") ? s.slice(2) : s;
        if (stripped.length % 64 !== 0)
        throw new Error("Invalid length for concatenated bytes32");

        const out: `0x${string}`[] = [];
        for (let i = 0; i < stripped.length; i += 64) {
        out.push(toBytes32(("0x" + stripped.slice(i, i + 64)) as `0x${string}`));
        }
        return out;
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

    const whitelist = useReadContract({
        address: contractAddress,
        abi: zkArcadeNftAbi,
        functionName: "isWhitelisted",
        args: userAddress ? [userAddress] : undefined,
        chainId,
    });

    const { writeContractAsync, data: txHash, ...txRest } = useWriteContract();
    const receipt = useWaitForTransactionReceipt({ hash: txHash });

    const claimNft = useCallback(async () => {
        if (!userAddress) throw new Error("Wallet no conectada");

        let proofArray: `0x${string}`[];
        try {
            proofArray = normalizeBytes32Array(proof);
        } catch (e: any) {
            addToast({ title: "Invalid merkle proof", desc: String(e?.message || e), type: "error" });
            return;
        }

        const hash = await writeContractAsync({
            address: contractAddress,
            abi: zkArcadeNftAbi,
            functionName: "claimNFT",
            args: [proofArray, tokenURI],
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

    return {
        balance,
        userInWhitelist: whitelist.data,
        claimNft,
        receipt,
        tx: { hash: txHash, ...txRest },
        disabled: !userAddress || (balance.data && balance.data >= 0n) || (whitelist.data === false),
    };
}
