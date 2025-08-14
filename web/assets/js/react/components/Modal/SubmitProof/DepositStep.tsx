import React, { useEffect, useState } from "react";
import { FormInput } from "../../Form/Input";
import { useBatcherPaymentService, useEthPrice } from "../../../hooks";
import { Address } from "../../../types/blockchain";
import { Button } from "../../Button";
import { formatEther } from "viem";
import { useToast } from "../../../state/toast";

const ALIGNED_DEPOSIT_LIMIT = 0.01;

export const DepositStep = ({
	payment_service_address,
	user_address,
	setOpen,
	updateState,
}: {
	payment_service_address: Address;
	user_address: Address;
	setOpen: (prev: boolean) => void;
	updateState: () => void;
}) => {
	const { price } = useEthPrice();
	const { sendFunds, balance } = useBatcherPaymentService({
		contractAddress: payment_service_address,
		userAddress: user_address,
	});
	const [balanceValue, setBalanceValue] = useState("");

	const recommendedBalance = 0.001;
	const hasEnoughBalance =
		Number(formatEther(balance.data || BigInt(0))) >= recommendedBalance;

	const { addToast } = useToast();

	useEffect(() => {
		if (sendFunds.receipt.isLoading) {
			addToast({
				title: "Transaction sent",
				desc: "Transaction was sent, waiting for receipt...",
				type: "success",
			});
		}
	}, [sendFunds.receipt.isLoading]);

	useEffect(() => {
		if (sendFunds.receipt.isSuccess && sendFunds.receipt.data) {
			updateState();
			addToast({
				title: "Balance deposit confirmed",
				desc: "The transaction was successful, your balance has been updated",
				type: "success",
			});
		}
	}, [sendFunds.receipt.isSuccess, sendFunds.receipt.data]);

	useEffect(() => {
		if (sendFunds.transaction.isError) {
			const errorMessage =
				sendFunds.transaction.error?.message ||
				"Something went wrong with the transaction.";

			addToast({
				title: "Transaction failed",
				desc: errorMessage,
				type: "error",
			});
		}
	}, [sendFunds.transaction.isError, sendFunds.transaction.error]);

	useEffect(() => {
		if (sendFunds.receipt.isError) {
			const errorMessage =
				sendFunds.receipt.error?.message ||
				"Something went wrong with the transaction.";

			addToast({
				title: "Transaction failed",
				desc: errorMessage,
				type: "error",
			});
		}
	}, [sendFunds.receipt.isError, sendFunds.receipt.error]);

	const handleBalanceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const value = e.target.value;
		const numValue = Number(value);

		if (numValue > ALIGNED_DEPOSIT_LIMIT) {
			setBalanceValue(ALIGNED_DEPOSIT_LIMIT.toString());
		} else {
			setBalanceValue(value);
		}
	};

	const isValidAmount = () => {
		const numValue = Number(balanceValue);
		return numValue > 0 && numValue <= ALIGNED_DEPOSIT_LIMIT;
	};

	return (
		<div className="w-full h-full flex flex-col gap-8 justify-between">
			<div className="w-full">
				<FormInput
					label="Amount to deposit in eth:"
					placeholder="0.0001"
					type="number"
					value={balanceValue}
					onChange={handleBalanceChange}
					min="0"
					step="0.0001"
				/>
				<p className="mt-1">
					~
					{((price || 0) * Number(balanceValue)).toLocaleString(
						undefined,
						{
							maximumFractionDigits: 3,
						}
					)}{" "}
					USD
				</p>
			</div>
			<div className="flex flex-col gap-3">
				{hasEnoughBalance ? (
					<p className="bg-accent-100/20 rounded p-2 text-accent-100">
						You have the recommended balance in your account, you
						can skip this step.
					</p>
				) : (
					<p className="bg-yellow/20 rounded p-2 text-yellow">
						You don't have the recommended balance in your account,
						we suggest you deposit at least {recommendedBalance} ETH
					</p>
				)}
				{Number(balanceValue) >= ALIGNED_DEPOSIT_LIMIT && (
					<p className="bg-red/20 rounded p-2 text-red">
						The maximum deposit value is {ALIGNED_DEPOSIT_LIMIT} ETH
					</p>
				)}
				<p>
					Your current balance:{" "}
					{Number(formatEther(balance.data || BigInt(0))).toFixed(4)}{" "}
					ETH
				</p>
			</div>
			<div className="flex items-center justify-end">
				<Button
					variant="text"
					className="mr-10 font-normal"
					onClick={() => setOpen(false)}
				>
					Cancel
				</Button>
				<Button
					variant="accent-fill"
					onClick={async () => {
						await sendFunds.send(balanceValue);
					}}
					isLoading={sendFunds.receipt.isLoading}
					disabled={Number(balanceValue) == 0 || !isValidAmount()}
				>
					Deposit
				</Button>
			</div>
		</div>
	);
};
