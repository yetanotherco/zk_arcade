import React, { useEffect, useState } from "react";
import { ProofSubmission } from "../../types/aligned";
import { timeAgoInHs } from "../../utils/date";
import { Button } from "../../components";
import { bytesToHex } from "viem";
import { computeVerificationDataCommitment } from "../../utils/aligned";

type Props = {
	proofs: ProofSubmission[];
};

const textBasedOnNotEntry = {
	pending: (commitment: string) => (
		<>
			The proof <span className="font-bold">{commitment}</span> is
			underpriced we suggest you bump the fee
		</>
	),
	submitted: (commitment: string) => (
		<>
			The proof <span className="font-bold">{commitment}</span> is ready
			to be submitted`
		</>
	),
};

const NotificationEntry = ({ proof }: { proof: ProofSubmission }) => {
	const [proofCommitment, setProofCommitment] = useState("");

	useEffect(() => {
		const commitment = computeVerificationDataCommitment(
			proof.verificationData.verificationData
		);

		const proofHash = bytesToHex(commitment.commitmentDigest);

		const proofHashShorten = `${proofHash.slice(0, 2)}...${proofHash.slice(
			-4
		)}`;

		setProofCommitment(proofHashShorten);
	}, [proof, setProofCommitment]);

	const handleClick = () => {};

	return (
		<div className="flex flex-row w-full items-end justify-between gap-4">
			<div className="flex items-center gap-4">
				<div
					className={`rounded-full h-[10px] w-[10px] ${
						proof.status === "submitted"
							? "bg-accent-100"
							: "bg-orange"
					} shrink-0`}
				></div>
				<p className="text-sm text-text-100">
					{textBasedOnNotEntry[proof.status](proofCommitment)}
				</p>
			</div>
			<Button
				variant="text-accent"
				className="text-sm text-nowrap"
				onClick={handleClick}
			>
				{proof.status === "submitted" ? "Submit" : "Bump fee"}
			</Button>
		</div>
	);
};

export const NotificationBell = ({ proofs }: Props) => {
	const [proofsReady, setProofsReady] = useState<ProofSubmission[]>([]);
	const [proofsUnderpriced, setProofsUnderpriced] = useState<
		ProofSubmission[]
	>([]);

	const [allProofs, setAllProofs] = useState<ProofSubmission[]>([]);

	useEffect(() => {
		const proofsReady = proofs.filter(
			proof => proof.status === "submitted"
		);

		const proofsUnderpriced = proofs.filter(
			proof =>
				proof.status === "pending" && timeAgoInHs(proof.insertedAt) > 6
		);

		const allProofs = proofs.filter(
			proof =>
				proof.status === "submitted" ||
				(proof.status === "pending" &&
					timeAgoInHs(proof.insertedAt) > 6)
		);

		setProofsReady(proofsReady);
		setProofsUnderpriced(proofsUnderpriced);
		setAllProofs(allProofs);
	}, [proofs, setProofsReady, setProofsUnderpriced]);

	return (
		<div className="sm:relative group">
			<div className="relative">
				<span className="hero-bell size-7"></span>
				{proofsReady.length > 0 && (
					<div className="rounded-full h-[10px] w-[10px] bg-accent-100 absolute top-0 left-0"></div>
				)}
				{proofsUnderpriced.length > 0 && (
					<div className="rounded-full h-[10px] w-[10px] bg-orange absolute top-0 left-[5px]"></div>
				)}
			</div>

			<div className="pt-2">
				<div className="flex flex-col gap-8 p-8 absolute max-sm:left-0 sm:w-[350px] w-full sm:right-0 shadow-2xl bg-contrast-100 rounded opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity duration-200 z-10">
					<div>
						<h1 className="text-text-100 text-lg mb-2">
							Notifications
						</h1>
						<p className="text-sm text-text-200">
							Get the status of your proofs
						</p>
					</div>
					<div
						className="overflow-scroll flex flex-col gap-4"
						style={{ maxHeight: 200 }}
					>
						{allProofs.map(proof => (
							<NotificationEntry proof={proof} />
						))}
						{allProofs.map(proof => (
							<NotificationEntry proof={proof} />
						))}
					</div>
				</div>
			</div>
		</div>
	);
};
