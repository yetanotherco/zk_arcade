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
	const { balance, unlockTime, unlockFunds, withdrawFunds, lockFunds } = useBatcherPaymentService({
		contractAddress: payment_service_address,
		userAddress: user_address,
	});
	const [withdrawValue, setWithdrawValue] = useState("");
	const { addToast } = useToast();

	const availableBalance = balance.data ? formatEther(balance.data) : "0";
	const maxWithdrawAmount = Number(availableBalance);
	
	const unlockBlockTime = unlockTime.data ? Number(unlockTime.data) : 0;
	const currentTimeInSeconds = Math.floor(Date.now() / 1000);
	const isUnlocked = unlockBlockTime > 0 && currentTimeInSeconds >= unlockBlockTime;
	const isUnlocking = unlockBlockTime > 0 && currentTimeInSeconds < unlockBlockTime;
	const timeRemaining = isUnlocking ? unlockBlockTime - currentTimeInSeconds : 0;

	const formatTimeRemaining = (seconds: number) => {
		const hours = Math.floor(seconds / 3600);
		const minutes = Math.floor((seconds % 3600) / 60);
		const secs = seconds % 60;
		return `${hours}h ${minutes}m ${secs}s`;
	};

	useEffect(() => {
		if (unlockFunds.receipt.isLoading) {
			addToast({
				title: "Unlock transaction sent",
				desc: "Unlock transaction was sent, waiting for confirmation...",
				type: "success",
			});
		}
	}, [unlockFunds.receipt.isLoading]);

	useEffect(() => {
		if (unlockFunds.receipt.isSuccess) {
			addToast({
				title: "Funds unlock initiated",
				desc: "Your funds will be available for withdrawal in 1 hour",
				type: "success",
			});
		}
	}, [unlockFunds.receipt.isSuccess]);

	useEffect(() => {
		if (withdrawFunds.receipt.isLoading) {
			window.setTimeout(() => setOpen(false), 250);
			addToast({
				title: "Withdrawal transaction sent",
				desc: "Withdrawal transaction was sent, waiting for receipt...",
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
			
			// Here we refresh the page to show the updated balance and the lock time
			setTimeout(() => {
				window.location.reload();
			}, 1000);
		}
	}, [withdrawFunds.receipt.isSuccess, withdrawFunds.receipt.data]);

	useEffect(() => {
		if (unlockFunds.transaction.isError) {
			const errorMessage =
				unlockFunds.transaction.error?.message ||
				"Something went wrong with the unlock transaction.";
			addToast({
				title: "Unlock failed",
				desc: errorMessage,
				type: "error",
			});
		}
	}, [unlockFunds.transaction.isError]);

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
	}, [withdrawFunds.transaction.isError]);

	const handleMaxClick = () => {
		setWithdrawValue(availableBalance);
	};

	const isValidAmount = () => {
		const amount = Number(withdrawValue);
		return amount > 0 && amount <= maxWithdrawAmount;
	};

	const handleUnlock = async () => {
		await unlockFunds.send();
	};

	const handleWithdraw = async () => {
		await withdrawFunds.send(withdrawValue);
	};

	const handleLock = async () => {
		await lockFunds.send();
	};

	return (
		<Modal maxWidth={500} open={open} setOpen={setOpen}>
			<div className="bg-contrast-100 w-full p-10 py-12 rounded flex flex-col items-center gap-3">
				<h3 className="text-md font-bold mb-2">
					Withdraw from Aligned Batcher
				</h3>
				
				<div className="w-full">
					<div className="mb-4 p-3 rounded flex justify-center">
						{unlockBlockTime === 0 && (
							<div className="text-sm">
								<div className="flex items-center gap-4">
									<Button
										variant="text-accent"
										onClick={handleUnlock}
										isLoading={unlockFunds.receipt.isLoading}
										disabled={maxWithdrawAmount === 0}
										className=""
									>
										{(Number(availableBalance) === 0) ? "No funds available" : "Unlock Funds"}
									</Button>

									<div className="relative group">
										<span className="text-white text-sm underline cursor-help">
											Why?
										</span>
										<div className="absolute left-1/2 top-full transform -translate-x-[70%] translate-y-2 hidden group-hover:block z-10">
											<div className="bg-white text-black text-xs rounded shadow-lg px-2 py-1 
															opacity-0 group-hover:opacity-100 transition-opacity duration-200 
															break-words whitespace-normal max-w-sm min-w-[400px] pointer-events-none">
											Funds are locked for security. You need to unlock them first and wait 1 hour before withdrawing.
											</div>
										</div>
									</div>
								</div>
							</div>
						)}
						
						{isUnlocking && (
							<div className="text-sm">
								<p className="text-black-600 mb-2">
									Funds are unlocking in: {formatTimeRemaining(timeRemaining)}
								</p>
								<Button
									variant="text-accent"
									onClick={handleLock}
									isLoading={lockFunds.receipt.isLoading}
									className="w-full"
								>
									Cancel Unlock
								</Button>
							</div>
						)}
						
						{isUnlocked && (
							<div className="text-sm">
								<p className="mb-2">
									Funds are ready for withdrawal
								</p>
								<Button
									variant="text"
									onClick={handleLock}
									isLoading={lockFunds.receipt.isLoading}
									className="w-full text-sm border border-white-100 px-2 py-1"
								>
									Lock Funds Again
								</Button>
							</div>
						)}
					</div>
					
					<FormInput
						label="Amount to withdraw in ETH:"
						placeholder="0.001"
						type="number"
						value={withdrawValue}
						onChange={e => setWithdrawValue(e.target.value)}
						min="0"
						max={availableBalance}
						step="0.001"
						disabled={!isUnlocked}
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

					<div className="flex justify-between items-center mb-2">
						<span className="text-sm">
							Balance: {Number(availableBalance).toFixed(6)} ETH
						</span>
						<Button
							variant="text"
							className="text-sm px-2 py-1"
							onClick={handleMaxClick}
						>
							Max
						</Button>
					</div>
					
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
						onClick={handleWithdraw}
						isLoading={withdrawFunds.receipt.isLoading}
						disabled={!isValidAmount() || !isUnlocked || balance.isLoading}
					>
						{!isUnlocked ? "Unlock Required" : "Confirm Withdrawal"}
					</Button>
				</div>
			</div>
		</Modal>
	);
};
