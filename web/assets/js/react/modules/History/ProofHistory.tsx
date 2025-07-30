import React, { useEffect, useState } from "react";
import { Address } from "../../types/blockchain";
import { useBatcherPaymentService, useLeaderboardContract } from "../../hooks";
import { bytesToHex, formatEther } from "viem";
import { ColumnBody, Table, TableBodyItem } from "../../components/Table";
import { ProofSubmission } from "../../types/aligned";
import { timeAgo, timeAgoInHs } from "../../utils/date";
import { computeVerificationDataCommitment } from "../../utils/aligned";
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
};

export const ProofHistory = ({
	proofs,
	leaderboard_address,
	user_address,
	payment_service_address,
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
		if (historyBalance)
			historyBalance.innerText =
				`${formatEther(balance.data || BigInt(0))} ETH` || "...";
		if (historyScore)
			historyScore.innerText = score.data?.toString() || "...";
	}, [balance, score]);

	useEffect(() => {
		const rows: ColumnBody[] = proofs.map(item => {
			const proof = { ...item };

			// if the proof is pending and it has passed more than 6 hours
			// mark it as underpriced
			if (proof.status === "pending") {
				if (timeAgoInHs(proof.insertedAt) > 6) {
					proof.status = "underpriced";
				}
			}

			return {
				rows: [
					<TableBodyItem text={proof.game} />,
					<ProofStatusWithTooltipDesc proof={proof} />,
					<TableBodyItem text={timeAgo(proof.insertedAt)} />,
					<ProofBatchMerkleRoot proof={proof} />,
					<TableBodyItem
						text={shortenHash(
							bytesToHex(
								computeVerificationDataCommitment(
									proof.verificationData.verificationData
								).commitmentDigest
							)
						)}
					/>,
					<TableBodyItem
						text={
							proof.verificationData.verificationData
								.provingSystem
						}
					/>,
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
