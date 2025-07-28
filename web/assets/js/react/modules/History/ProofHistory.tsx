import React, { useEffect } from "react";
import { Address } from "../../types/blockchain";
import { useBatcherPaymentService, useLeaderboardContract } from "../../hooks";
import { formatEther } from "viem";

type Props = {
	leaderboard_address: Address;
	user_address: Address;
	payment_service_address: Address;
	proofs: string;
};

export const ProofHistory = ({
	proofs,
	leaderboard_address,
	user_address,
	payment_service_address,
}: Props) => {
	const { balance } = useBatcherPaymentService({
		contractAddress: payment_service_address,
		userAddress: user_address,
	});
	const { score } = useLeaderboardContract({
		userAddress: user_address,
		contractAddress: leaderboard_address,
	});

	useEffect(() => {
		const historyBalance = document.getElementById("history-balance");
		const historyScore = document.getElementById("history-score");
		if (historyBalance)
			historyBalance.innerText =
				`${formatEther(balance.data || BigInt(0))} ETH` || "...";
		if (historyScore)
			historyScore.innerText = score.data?.toString() || "...";
	}, [balance, score]);

	return (
		<div>
			<p>Hello World!</p>
		</div>
	);
};
