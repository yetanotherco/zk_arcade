import React from "react";
import { ProofSubmission } from "../../types/aligned";
import { shortenHash } from "../../utils/crypto";
import { timeAgoInHs } from "../../utils/date";

type KeysForStatus = ProofSubmission["status"];

const colorBasedOnStatus: {
	[key in KeysForStatus]: string;
} = {
	verified: "bg-accent-100/20 text-accent-100",
	submitted: "bg-accent-200 text-black",
	pending: "bg-yellow/20 text-yellow",
	claimed: "bg-blue/20 text-blue",
	failed: "bg-red/20 text-red",
	underpriced: "bg-orange/20 text-orange",
};

const statusText: { [key in KeysForStatus]: string } = {
	claimed: "Claimed",
	verified: "Ready",
	submitted: "Processing",
	pending: "Pending",
	failed: "Failed",
	underpriced: "Pending",
};

type Props = {
	proof: ProofSubmission;
	explorer_url: string;
};

export const ProofStatusWithTooltipDesc = ({ proof }: Props) => {
	const isUnderpriced = proof.status === "pending" && timeAgoInHs(proof.inserted_at) > 6;
	if (isUnderpriced) proof.status = "underpriced";
	return (
		<td>
			<div
				className={`relative group/tooltip flex flex-row gap-2 items-center rounded px-1 w-fit ${
					colorBasedOnStatus[proof.status]
				}`}
			>
				<span className="hero-information-circle solid size-5"></span>
				<p>{statusText[proof.status]}</p>
			</div>
		</td>
	);
};

export const ProofBatchMerkleRoot = ({ proof, explorer_url }: Props) => {
	return (
		<td>
			{proof.batch_hash ? (
				<a
					href={`${explorer_url}/batches/${proof.batch_hash}`}
					className="underline"
					target="_blank"
					rel="noopener noreferrer"
				>
					{shortenHash(proof.batch_hash)}
				</a>
			) : (
				<p>...</p>
			)}
		</td>
	);
};

export const ProofClaimTxHash = ({ proof, explorer_url }: Props) => {
	return (
		<td>
			{proof.claim_tx_hash ? (
				<a
					// TODO: show different explorer based on the chain
					href={`https://holesky.etherscan.io/tx/${proof.claim_tx_hash}`}
					className="underline"
					target="_blank"
					rel="noopener noreferrer"
				>
					{shortenHash(proof.claim_tx_hash)}
				</a>
			) : (
				<p>...</p>
			)}
		</td>
	);
};
