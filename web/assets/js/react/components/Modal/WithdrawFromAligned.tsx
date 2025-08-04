import React, { useEffect, useState } from "react";
import { Modal } from "./Modal";
import { useBatcherPaymentService, useEthPrice } from "../../hooks";
import { Button } from "../Button";
import { FormInput } from "../Form";
import { Address } from "../../types/blockchain";
import { useToast } from "../../state/toast";
import { formatEther } from "viem";

type Props = {
	open: boolean;
	setOpen: (prev: boolean) => void;
	payment_service_address: Address;
	user_address: Address;
};

export const WithdrawFromAlignedModal = ({
	open,
	setOpen,
	payment_service_address,
	user_address,
}: Props) => {
	const { price } = useEthPrice();
	const { balance, withdrawFunds } = useBatcherPaymentService({
		contractAddress: payment_service_address,
		userAddress: user_address,
	});
	const [withdrawValue, setWithdrawValue] = useState("");
	const { addToast } = useToast();

	const availableBalance = balance.data ? formatEther(balance.data) : "0";
	const maxWithdrawAmount = Number(availableBalance);

	useEffect(() => {
		if (withdrawFunds.receipt.isLoading) {
			window.setTimeout(() => setOpen(false), 250);
			addToast({
				title: "Transaction sent",
				desc: "Withdrawal transaction was sent successfully, waiting for receipt...",
				type: "success",
			});
		}
	}, [withdrawFunds.receipt.isLoading]);

	useEffect(() => {
		if (withdrawFunds.receipt.isSuccess && withdrawFunds.receipt.data) {
			addToast({
				title: "Withdrawal confirmed",
				desc: "The withdrawal transaction was included, your balance has been updated",
				type: "success",
			});
		}
	}, [withdrawFunds.receipt.isSuccess, withdrawFunds.receipt.data]);

	useEffect(() => {
		if (withdrawFunds.transaction.isError) {
			const errorMessage =
				withdrawFunds.transaction.error?.message ||
				"Something went wrong with the withdrawal transaction.";

			addToast({
				title: "Withdrawal failed",
				desc: errorMessage,
				type: "error",
			});
		}
	}, [withdrawFunds.transaction.isError, withdrawFunds.transaction.error]);

	useEffect(() => {
		if (withdrawFunds.receipt.isError) {
			const errorMessage =
				withdrawFunds.receipt.error?.message ||
				"Something went wrong with the withdrawal transaction.";

			addToast({
				title: "Withdrawal failed",
				desc: errorMessage,
				type: "error",
			});
		}
	}, [withdrawFunds.receipt.isError, withdrawFunds.receipt.error]);

	const handleMaxClick = () => {
		setWithdrawValue(availableBalance);
	};

	const isValidAmount = () => {
		const amount = Number(withdrawValue);
		return amount > 0 && amount <= maxWithdrawAmount;
	};

	return (
		<Modal maxWidth={500} open={open} setOpen={setOpen}>
			<div className="bg-contrast-100 w-full p-10 rounded flex flex-col items-center gap-8">
				<h3 className="text-md font-bold mb-2">
					Withdraw from Aligned Batcher
				</h3>
				
				<div className="w-full">
					<div className="flex justify-between items-center mb-2">
						<span className="text-sm text-gray-600">
							Available balance: {Number(availableBalance).toFixed(6)} ETH
						</span>
						<Button
							variant="text"
							className="text-sm px-2 py-1"
							onClick={handleMaxClick}
						>
							Max
						</Button>
					</div>
					
					<FormInput
						label="Amount to withdraw in ETH:"
						placeholder="0.0001"
						type="number"
						value={withdrawValue}
						onChange={e => setWithdrawValue(e.target.value)}
						min="0"
						max={availableBalance}
						step="0.0001"
					/>
					
					<p className="mt-1">
						~
						{((price || 0) * Number(withdrawValue)).toLocaleString(
							undefined,
							{
								maximumFractionDigits: 3,
							}
						)}{" "}
						USD
					</p>
					
					{Number(withdrawValue) > maxWithdrawAmount && (
						<p className="mt-1 text-red-500 text-sm">
							Amount exceeds available balance
						</p>
					)}
				</div>
				
				<div>
					<Button
						variant="text"
						className="mr-10"
						onClick={() => setOpen(false)}
					>
						Cancel
					</Button>
					<Button
						variant="accent-fill"
						onClick={async () => {
							await withdrawFunds.send(withdrawValue);
						}}
						isLoading={withdrawFunds.receipt.isLoading}
						disabled={!isValidAmount() || balance.isLoading}
					>
						Confirm Withdrawal
					</Button>
				</div>
			</div>
		</Modal>
	);
};
