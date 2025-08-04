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
		data: unlockHash,
		writeContractAsync: unlockWriteContract,
		...unlockTransactionData
	} = useWriteContract();

	const unlockReceiptData = useWaitForTransactionReceipt({
		hash: unlockHash,
	});

	const {
		data: lockHash,
		writeContractAsync: lockWriteContract,
		...lockTransactionData
	} = useWriteContract();

	const lockReceiptData = useWaitForTransactionReceipt({
		hash: lockHash,
	});

	const {
		data: withdrawHash,
		writeContractAsync: withdrawWriteContract,
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

	const { ...unlockTimeFetchData } = useReadContract({
		address: contractAddress,
		abi: batcherPaymentServiceAbi,
		functionName: "user_unlock_block",
		args: [userAddress],
		chainId,
	});

	const sendFunds = useCallback(
		async (amountToDepositInEther: string) => {
			const value = parseEther(amountToDepositInEther);
			await sendTransactionAsync({
				to: contractAddress,
				value,
				chainId,
			});
		},
		[sendTransactionAsync, contractAddress, chainId]
	);

	const unlockFunds = useCallback(
		async () => {
			await unlockWriteContract({
				address: contractAddress,
				abi: batcherPaymentServiceAbi,
				functionName: "unlock",
				args: [],
				chainId,
			});
		},
		[unlockWriteContract, contractAddress, chainId]
	);

	const lockFunds = useCallback(
		async () => {
			await lockWriteContract({
				address: contractAddress,
				abi: batcherPaymentServiceAbi,
				functionName: "lock",
				args: [],
				chainId,
			});
		},
		[lockWriteContract, contractAddress, chainId]
	);

	const withdrawFunds = useCallback(
		async (amountToWithdrawInEther: string) => {
			const value = parseEther(amountToWithdrawInEther);
			await withdrawWriteContract({
				address: contractAddress,
				abi: batcherPaymentServiceAbi,
				functionName: "withdraw",
				args: [value],
				chainId,
			});
		},
		[withdrawWriteContract, contractAddress, chainId]
	);

	useEffect(() => {
		if (depositReceiptData.isSuccess) {
			balanceFetchData.refetch();
		}
	}, [depositReceiptData.isSuccess]);

	useEffect(() => {
		if (withdrawReceiptData.isSuccess) {
			balanceFetchData.refetch();
		}
	}, [withdrawReceiptData.isSuccess]);

	useEffect(() => {
		if (unlockReceiptData.isSuccess) {
			unlockTimeFetchData.refetch();
		}
	}, [unlockReceiptData.isSuccess]);

	useEffect(() => {
		if (lockReceiptData.isSuccess) {
			unlockTimeFetchData.refetch();
		}
	}, [lockReceiptData.isSuccess]);

	return {
		balance: {
			...balanceFetchData,
			data: balanceFetchData.data as bigint | undefined,
		},
		nonce: {
			...nonceFetchData,
			data: nonceFetchData.data as bigint | undefined,
		},
		unlockTime: {
			...unlockTimeFetchData,
			data: unlockTimeFetchData.data as bigint | undefined,
		},
		sendFunds: {
			send: sendFunds,
			transaction: depositTransactionData,
			receipt: depositReceiptData,
		},
		unlockFunds: {
			send: unlockFunds,
			transaction: unlockTransactionData,
			receipt: unlockReceiptData,
		},
		lockFunds: {
			send: lockFunds,
			transaction: lockTransactionData,
			receipt: lockReceiptData,
		},
		withdrawFunds: {
			send: withdrawFunds,
			transaction: withdrawTransactionData,
			receipt: withdrawReceiptData,
		},
	};
};
