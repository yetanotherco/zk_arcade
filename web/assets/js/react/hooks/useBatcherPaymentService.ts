import { Address } from "viem";
import { useChainId, useReadContract } from "wagmi";
import { batcherPaymentServiceAbi } from "../constants/aligned";

type Args = {
	contractAddress: Address;
	userAddress?: Address;
};

export const useBatcherPaymentService = ({
	contractAddress,
	userAddress,
}: Args) => {
	const chainId = useChainId();

	const { ...balanceFetchData } = useReadContract({
		address: contractAddress,
		abi: batcherPaymentServiceAbi,
		functionName: "user_balances",
		args: [userAddress],
		chainId,
	});

	const { ...nonceFetchData } = useReadContract({
		address: contractAddress,
		abi: batcherPaymentServiceAbi,
		functionName: "user_nonces",
		args: [userAddress],
		chainId,
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
