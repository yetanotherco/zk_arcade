import { Address, parseEther } from "viem";
import {
	useChainId,
	useReadContract,
	useSendTransaction,
	useWaitForTransactionReceipt,
} from "wagmi";
import { batcherPaymentServiceAbi } from "../constants/aligned";
import { useCallback, useEffect } from "react";

type Args = {
	contractAddress: Address;
	userAddress?: Address;
};

export const useBatcherPaymentService = ({
	contractAddress,
	userAddress,
}: Args) => {
	const chainId = useChainId();

	const {
		data: hash,
		sendTransaction,
		...sendFundsData
	} = useSendTransaction();
	const { isLoading, isSuccess } = useWaitForTransactionReceipt({
		hash,
	});

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

	const sendFunds = useCallback(
		(amountToDepositInEther: string) => {
			const value = parseEther(amountToDepositInEther);
			sendTransaction({ to: contractAddress, value });
		},
		[sendTransaction]
	);

	useEffect(() => {
		balanceFetchData.refetch();
	}, [isSuccess]);

	return {
		balance: {
			...balanceFetchData,
			data: balanceFetchData.data as bigint | undefined,
		},
		nonce: {
			...nonceFetchData,
			data: nonceFetchData.data as bigint | undefined,
		},
		sendFunds: {
			send: sendFunds,
			...sendFundsData,
			isLoading,
			isSuccess,
		},
	};
};
