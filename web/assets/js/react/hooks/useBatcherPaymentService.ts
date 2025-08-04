import { Address, parseEther } from "viem";
import {
	useChainId,
	useReadContract,
	useSendTransaction,
	useWaitForTransactionReceipt,
	useWriteContract,
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
		data: depositHash,
		sendTransactionAsync,
		...depositTransactionData
	} = useSendTransaction();

	const depositReceiptData = useWaitForTransactionReceipt({
		hash: depositHash,
	});

	const {
		data: withdrawHash,
		writeContractAsync,
		...withdrawTransactionData
	} = useWriteContract();

	const withdrawReceiptData = useWaitForTransactionReceipt({
		hash: withdrawHash,
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
		[sendTransactionAsync, contractAddress]
	);

	const withdrawFunds = useCallback(
		async (amountToWithdrawInEther: string) => {
			const value = parseEther(amountToWithdrawInEther);
			await writeContractAsync({
				address: contractAddress,
				abi: batcherPaymentServiceAbi,
				functionName: "withdraw",
				args: [value],
			});
		},
		[writeContractAsync, contractAddress]
	);

	useEffect(() => {
		if (depositReceiptData.isSuccess) {
			balanceFetchData.refetch();
		}
	}, [depositReceiptData.isSuccess, balanceFetchData]);

	useEffect(() => {
		if (withdrawReceiptData.isSuccess) {
			balanceFetchData.refetch();
		}
	}, [withdrawReceiptData.isSuccess, balanceFetchData]);

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
			transaction: depositTransactionData,
			receipt: depositReceiptData,
		},
		withdrawFunds: {
			send: withdrawFunds,
			transaction: withdrawTransactionData,
			receipt: withdrawReceiptData,
		},
	};
};
