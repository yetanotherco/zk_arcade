import React, { useEffect, useState } from "react";
import { Address } from "../../types/blockchain";
import { useBatcherPaymentService, useLeaderboardContract } from "../../hooks";
import { formatEther } from "viem";
import { ColumnBody, Table, TableBodyItem } from "../../components/Table";
import { ProofSubmission } from "../../types/aligned";
import { timeAgo, timeAgoInHs } from "../../utils/date";
import { shortenHash } from "../../utils/crypto";
import { useProofSentMessageReader } from "../../hooks/useProofSentMessageReader";
import { ProofEntryActionBtn } from "./ProofEntryActionBtn";
import {
	ProofBatchMerkleRoot,
	ProofStatusWithTooltipDesc,
} from "../../components/Table/ProofBodyItems";

type Props = {
	leaderboard_address: Address;
	user_address: Address;
	payment_service_address: Address;
	proofs: ProofSubmission[];
	explorer_url: string;
};

export const ProofHistory = ({
	proofs,
	leaderboard_address,
	user_address,
	payment_service_address,
	explorer_url,
}: Props) => {
	const [proofsTableRows, setProofsTableRows] = useState<ColumnBody[]>([]);
	useProofSentMessageReader();

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
		const balanceText = Number(
			formatEther(balance.data || BigInt(0))
		).toLocaleString(undefined, {
			maximumFractionDigits: 5,
		});

		if (historyBalance)
			historyBalance.innerText = `${balanceText} ETH` || "...";
		if (historyScore)
			historyScore.innerText = score.data?.toString() || "...";
	}, [balance, score]);

	useEffect(() => {
		const rows: ColumnBody[] = proofs.map(item => {
			const proof = { ...item };

			// if the proof is pending and it has passed more than 6 hours
			// mark it as underpriced
			if (proof.status === "pending") {
				if (timeAgoInHs(proof.inserted_at) > 6) {
					proof.status = "underpriced";
				}
			}

			return {
				rows: [
					<div>
						{proof.status === "claimed" ? (
							<div>
								<TableBodyItem text={proof.game} />
								<div className="group/tooltip flex flex-row gap-0.5 items-center" style={{ maxWidth: 50 }}>
									{[...Array(8)].map((_, index) => {
										return (
										<div
											key={index}
											className={`
											w-full h-[10px] mb-2
											${index < proof.level_reached ? 'bg-accent-100' : 'bg-contrast-100'}
											${index === 0 ? 'rounded-l-[3px]' : ''}
											${index === 7 ? 'rounded-r-[3px]' : ''}
											`}
										></div>
										);
									})}

									<div
										className="absolute translate-x-1/4 mt-2 bg-black text-white text-xs rounded px-2 py-1 opacity-0 group-hover/tooltip:opacity-100 transition pointer-events-none z-50"
										style={{ width: 200 }}
									>
										<p className="text-center">Reached level {proof.level_reached} in your last run</p>
									</div>
								</div>								
							</div>
						) : (
							<TableBodyItem text={proof.game} className={`flex items-center pt-4`} />
						)}
					</div>,
					<ProofStatusWithTooltipDesc proof={proof} explorer_url={explorer_url} />,
					<TableBodyItem text={timeAgo(proof.inserted_at)} />,
					<ProofBatchMerkleRoot proof={proof} explorer_url={explorer_url} />,
					<TableBodyItem
						text={shortenHash(proof.verification_data_commitment)}
					/>,
					<TableBodyItem text={proof.proving_system} />,
					<ProofEntryActionBtn
						leaderboard_address={leaderboard_address}
						payment_service_address={payment_service_address}
						user_address={user_address}
						proof={proof}
					/>,
				],
			};
		});

		setProofsTableRows(rows);
	}, []);

	return (
		<div className="overflow-auto" style={{ maxHeight: 500 }}>
			<Table
				style={{ minWidth: 1000 }}
				header={[
					{ text: "Game" },
					{ text: "Status" },
					{ text: "Sent At" },
					{ text: "Batch" },
					{ text: "Hash" },
					{ text: "Prover" },
					{ text: "Action" },
				]}
				body={proofsTableRows}
			/>
			<div></div>
		</div>
	);
};
