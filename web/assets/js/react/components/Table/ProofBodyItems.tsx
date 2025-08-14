import React from "react";
import { ProofSubmission } from "../../types/aligned";
import { shortenHash } from "../../utils/crypto";
import { timeAgoInHs } from "../../utils/date";

type KeysForStatus = ProofSubmission["status"];

const colorBasedOnStatus: {
	[key in KeysForStatus]: string;
} = {
	submitted: "bg-accent-100/20 text-accent-100",
	pending: "bg-yellow/20 text-yellow",
	claimed: "bg-blue/20 text-blue",
	failed: "bg-red/20 text-red",
	underpriced: "bg-orange/20 text-orange",
};

const tooltipStyleBasedOnStatus: {
	[key in KeysForStatus]: string;
} = {
	submitted: "bg-accent-100 text-black",
	pending: "bg-yellow text-black",
	claimed: "bg-blue text-white",
	failed: "bg-red text-white",
	underpriced: "bg-orange text-black",
};

const tooltipText: { [key in KeysForStatus]: string } = {
	submitted: "Solution verified and ready to be claimed",
	claimed: "Already submitted to leaderboard",
	pending: "You need to wait until its verified before submitting the solution",
	failed: "The proof failed to be verified, you have to re-send it",
	underpriced: "The proof is underpriced, we suggest bumping the fee",
};

const statusText: { [key in KeysForStatus]: string } = {
	claimed: "Claimed",
	submitted: "Ready",
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
