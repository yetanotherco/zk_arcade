import React, { useEffect, useState } from "react";
import { Modal } from "./Modal";
import { useBatcherPaymentService, useEthPrice } from "../../hooks";
import { Button } from "../Button";
import { FormInput } from "../Form";
import { Address } from "../../types/blockchain";
import { useToast } from "../../state/toast";

type Props = {
	open: boolean;
	setOpen: (prev: boolean) => void;
	payment_service_address: Address;
	user_address: Address;
};

const ALIGNED_DEPOSIT_LIMIT = 0.01;

export const DepositOnAlignedModal = ({
	open,
	setOpen,
	payment_service_address,
	user_address,
}: Props) => {
	const { price } = useEthPrice();
	const { sendFunds } = useBatcherPaymentService({
		contractAddress: payment_service_address,
		userAddress: user_address,
	});
	const [balanceValue, setBalanceValue] = useState("");
	const { addToast } = useToast();

	useEffect(() => {
		if (sendFunds.receipt.isLoading) {
			window.setTimeout(() => setOpen(false), 250);
			addToast({
				title: "Transaction sent",
				desc: "Transaction was sent, waiting for receipt...",
				type: "success",
			});
		}
	}, [sendFunds.receipt.isLoading]);

	useEffect(() => {
		if (sendFunds.receipt.isSuccess && sendFunds.receipt.data) {
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
		<Modal maxWidth={500} open={open} setOpen={setOpen}>
			<div className="bg-contrast-100 w-full p-10 rounded flex flex-col items-center gap-8">
				<h3 className="text-md font-bold mb-2">
					Deposit into Aligned Batcher
				</h3>
				<div className="w-full">
					<FormInput
						label="Amount to deposit in eth:"
						placeholder="0.0001"
						type="number"
						value={balanceValue}
						onChange={handleBalanceChange}
						min="0"
						max={ALIGNED_DEPOSIT_LIMIT.toString()}
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
							await sendFunds.send(balanceValue);
						}}
						isLoading={sendFunds.receipt.isLoading}
						disabled={!isValidAmount()}
					>
						Confirm
					</Button>
				</div>
			</div>
		</Modal>
	);
};
