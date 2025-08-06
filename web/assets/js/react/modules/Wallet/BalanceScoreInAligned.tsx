import React from "react";
import { formatEther } from "viem";
import { Address } from "../../types/blockchain";
import { Button } from "../../components";
import { useModal, useBatcherPaymentService } from "../../hooks";
import { useLeaderboardContract } from "../../hooks/useLeaderboardContract";
import { DepositOnAlignedModal } from "../../components/Modal/DepositOnAligned";
import { WithdrawFromAlignedModal } from "../../components/Modal/WithdrawFromAligned";

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
	const {
		open: openDeposit,
		setOpen: setOpenDeposit,
		toggleOpen: toggleOpenDeposit,
	} = useModal();

	const {
		open: openWithdraw,
		setOpen: setOpenWithdraw,
		toggleOpen: toggleOpenWithdraw,
	} = useModal();

	const { balance } = useBatcherPaymentService({
		contractAddress: payment_service_address,
		userAddress: user_address,
	});
	const { score } = useLeaderboardContract({
		userAddress: user_address,
		contractAddress: leaderboard_address,
	});

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
						onClick={toggleOpenDeposit}
					>
						Deposit
					</Button>
					<Button
						variant="text-accent"
						className="mt-2 ml-3"
						onClick={toggleOpenWithdraw}
					>
						Withdraw
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

			<DepositOnAlignedModal
				open={openDeposit}
				setOpen={setOpenDeposit}
				payment_service_address={payment_service_address}
				user_address={user_address}
			/>

			<WithdrawFromAlignedModal
				open={openWithdraw}
				setOpen={setOpenWithdraw}
				payment_service_address={payment_service_address}
				user_address={user_address}
			/>
		</>
	);
};
