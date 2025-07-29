import React, { useEffect, useState } from "react";
import { Address } from "../../types/blockchain";
import { useBatcherPaymentService, useLeaderboardContract } from "../../hooks";
import { bytesToHex, formatEther } from "viem";
import { ColumnBody, Table, TableBodyItem } from "../../components/Table";
import { ProofSubmission } from "../../types/aligned";
import { timeAgo } from "../../utils/date";
import { computeVerificationDataCommitment } from "../../utils/aligned";
import { shortenHash } from "../../utils/crypto";
import { Button } from "../../components";

const colorBasedOnStatus: { [key in ProofSubmission["status"]]: string } = {
	submitted: "bg-accent-100/20 text-accent-100",
	pending: "bg-yellow/20 text-yellow",
	claimed: "bg-blue/20 text-blue",
	failed: "bg-red/20 text-red",
};

const tooltipStyleBasedOnStatus: {
	[key in ProofSubmission["status"]]: string;
} = {
	submitted: "bg-accent-100 text-black",
	pending: "bg-yellow text-black",
	claimed: "bg-blue text-white",
	failed: "bg-red text-white",
};

const tooltipText: { [key in ProofSubmission["status"]]: string } = {
	submitted: "Solution verified and ready to be submitted",
	claimed: "Already submitted to leaderboard",
	pending:
		"You need to wait until its verified before submitting the solution",
	failed: "The proof failed to be verified, you have to re-send it",
};

const statusText: { [key in ProofSubmission["status"]]: string } = {
	claimed: "Claimed",
	submitted: "Ready",
	pending: "Pending",
	failed: "Failed",
};

const actionBtn: { [key in ProofSubmission["status"]]: string } = {
	claimed: "None",
	submitted: "Submit solution",
	pending: "Bump fee",
	failed: "None",
};

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
		const rows: ColumnBody = proofs.map(proof => ({
			rows: [
				<TableBodyItem text={proof.game} />,
				<td>
					<div
						className={`relative group/tooltip flex flex-row gap-2 items-center rounded px-1 w-fit ${
							colorBasedOnStatus[proof.status]
						}`}
					>
						<span className="hero-information-circle solid size-5"></span>
						<p>{statusText[proof.status]}</p>

						<div
							className={`${
								tooltipStyleBasedOnStatus[proof.status]
							} rounded absolute mt-2 rounded -left-1/2 top-full mb-2 text-sm rounded px-2 py-1 opacity-0 group-hover/tooltip:opacity-100 transition pointer-events-none`}
							style={{ width: 300, zIndex: 10000 }}
						>
							<p className="text-center text-xs">
								{tooltipText[proof.status]}
							</p>
						</div>
					</div>
				</td>,
				<TableBodyItem text={timeAgo(proof.insertedAt)} />,
				<td>
					{proof.batchData?.batch_merkle_root ? (
						<a
							href={`https://explorer.alignedlayer.com/batches/${proof.batchData.batch_merkle_root}`}
							className="underline"
						>
							{shortenHash(
								bytesToHex(proof.batchData.batch_merkle_root)
							)}
						</a>
					) : (
						<p>...</p>
					)}
				</td>,
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
					text={proof.verificationData.verificationData.provingSystem}
				/>,
				<td>
					<Button
						variant="contrast"
						className="text-nowrap text-sm w-full"
						disabled={
							proof.status === "claimed" ||
							proof.status === "failed"
						}
						style={{
							paddingLeft: 0,
							paddingRight: 0,
						}}
					>
						{actionBtn[proof.status]}
					</Button>
				</td>,
			],
		}));
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
		</div>
	);
};
