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
		sendTransactionAsync,
		...transactionData
	} = useSendTransaction();

	const receiptData = useWaitForTransactionReceipt({
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
		async (amountToDepositInEther: string) => {
			const value = parseEther(amountToDepositInEther);
			await sendTransactionAsync({
				to: contractAddress,
				value,
			});
		},
		[sendTransactionAsync]
	);

	useEffect(() => {
		balanceFetchData.refetch();
	}, [receiptData.isSuccess]);

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
			transaction: transactionData,
			receipt: receiptData,
		},
	};
};
