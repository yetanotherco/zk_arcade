import React, { useEffect, useRef, useState } from "react";
import { formatEther } from "viem";
import { Address } from "../../types/blockchain";
import { Button, Modal } from "../../components";
import { useModal, useBatcherPaymentService } from "../../hooks";
import { FormInput } from "../../components/";
import { useEthPrice } from "../../hooks/useEthPrice";

type Props = {
	payment_service_address: Address;
	user_address: Address;
};

export const BalanceScoreInAligned = ({
	payment_service_address,
	user_address,
}: Props) => {
	const { open, setOpen, toggleOpen } = useModal();
	const { price } = useEthPrice();
	const { balance, sendFunds } = useBatcherPaymentService({
		contractAddress: payment_service_address,
		userAddress: user_address,
	});
	const [balanceValue, setBalanceValue] = useState("");
	useEffect(() => {
		if (sendFunds.isLoading) {
			window.setTimeout(() => setOpen(false), 250);
		}
	}, [sendFunds.isLoading]);

	return (
		<>
			<div className="flex flex-row justify-between">
				<div>
					<h3 className="text-md font-bold mb-1">
						Balance on Aligned:
					</h3>
					<p>{formatEther(balance.data || BigInt(0))} ETH</p>
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
					<p>100</p>
				</div>
			</div>
			<Modal open={open} setOpen={setOpen}>
				<div
					className="bg-contrast-100 p-10 rounded flex flex-col items-center gap-8"
					style={{ minWidth: 500 }}
				>
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
						<Button variant="text" onClick={toggleOpen}>
							Cancel
						</Button>
						<Button
							variant="accent-fill"
							onClick={() => {
								sendFunds.send(balanceValue);
							}}
							isLoading={sendFunds.isLoading}
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
