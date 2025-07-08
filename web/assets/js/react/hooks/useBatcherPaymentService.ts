import { Address } from "viem";
import { useReadContract } from "wagmi";
import { batcherPaymentServiceAbi } from "../constants/aligned";

type Args = {
    contractAddress: Address;
    userAddress?: Address;
};

export const useBatcherPaymentService = ({
    contractAddress,
    userAddress,
}: Args) => {
    const { ...balanceFetchData } = useReadContract({
        address: contractAddress,
        abi: batcherPaymentServiceAbi,
        functionName: "user_balances",
        args: [userAddress],
        chainId: 31337,
    });

    const { ...nonceFetchData } = useReadContract({
        address: contractAddress,
        abi: batcherPaymentServiceAbi,
        functionName: "user_nonces",
        args: [userAddress],
        chainId: 31337,
    });

    return {
        balance: {
            ...balanceFetchData,
            data: balanceFetchData.data as bigint | undefined,
        },
        nonce: {
            ...nonceFetchData,
            data: nonceFetchData.data as bigint | undefined,
        },
    };
};
