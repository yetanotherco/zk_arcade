import React, { useEffect, useRef, useState } from "react";
import { formatEther } from "viem";
import { Address } from "../../types/blockchain";
import { Button, Modal } from "../../components";
import { useModal, useBatcherPaymentService } from "../../hooks";
import { FormInput } from "../../components/";
import { useEthPrice } from "../../hooks/useEthPrice";
import { useToast } from "../../state/toast";
import { useLeaderboardContract } from "../../hooks/useLeaderboardContract";

type Props = {
	payment_service_address: Address;
	leaderboard_address: Address;
	user_address: Address;
};

export const BalanceScoreInAligned = ({
	payment_service_address,
	leaderboard_address,
	user_address,
}: Props) => {
	const { open, setOpen, toggleOpen } = useModal();
	const { price } = useEthPrice();
	const { balance, sendFunds } = useBatcherPaymentService({
		contractAddress: payment_service_address,
		userAddress: user_address,
	});
	const { score } = useLeaderboardContract({
		userAddress: user_address,
		contractAddress: leaderboard_address,
	});
	const [balanceValue, setBalanceValue] = useState("");
	const { addToast } = useToast();

	useEffect(() => {
		if (sendFunds.receipt.isLoading) {
			window.setTimeout(() => setOpen(false), 250);
			addToast({
				title: "Transaction sent",
				desc: "Transaction was sent successfully, waiting for receipt...",
				type: "success",
			});
		}
	}, [sendFunds.receipt.isLoading]);

	useEffect(() => {
		if (sendFunds.receipt.isSuccess && sendFunds.receipt.data) {
			addToast({
				title: "Balance deposit confirmed",
				desc: "The transaction was included, your balance has been updated",
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

	return (
		<>
			<div className="flex flex-row justify-between">
				<div>
					<h3 className="text-md font-bold mb-1">
						Balance on Aligned:
					</h3>
					<p>
						{Number(
							formatEther(balance.data || BigInt(0))
						).toLocaleString(undefined, {
							maximumFractionDigits: 5,
						})}{" "}
						ETH
					</p>
					<Button
						variant="text-accent"
						className="mt-2"
						onClick={toggleOpen}
					>
						Deposit
					</Button>
				</div>
				<div>
					<h3 className="text-md font-bold mb-1">Score:</h3>
					<p>
						{score.isLoading || score.isError
							? "..."
							: Number(score.data)}
					</p>
				</div>
			</div>

			{/* Deposit on aligned modal */}
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
							onChange={e => setBalanceValue(e.target.value)}
						/>
						<p className="mt-1">
							~
							{(
								(price || 0) * Number(balanceValue)
							).toLocaleString(undefined, {
								maximumFractionDigits: 3,
							})}{" "}
							USD
						</p>
					</div>
					<div>
						<Button
							variant="text"
							className="mr-10"
							onClick={toggleOpen}
						>
							Cancel
						</Button>
						<Button
							variant="accent-fill"
							onClick={async () => {
								await sendFunds.send(balanceValue);
							}}
							isLoading={sendFunds.receipt.isLoading}
							disabled={Number(balanceValue) == 0}
						>
							Confirm
						</Button>
					</div>
				</div>
			</Modal>
		</>
	);
};
