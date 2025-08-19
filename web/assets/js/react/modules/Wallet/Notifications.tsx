import React, { useEffect, useState } from "react";
import { BeastProofClaimed, ProofSubmission } from "../../types/aligned";
import { timeAgoInHs } from "../../utils/date";
import { Button } from "../../components";
import { useModal } from "../../hooks";
import { Address } from "../../types/blockchain";
import { shortenHash } from "../../utils/crypto";
import { SubmitProofModal } from "../../components/Modal/SubmitProof";

type Props = {
	proofs: ProofSubmission[];
	leaderboard_address: Address;
	payment_service_address: Address;
	user_address: Address;
	batcher_url: string;
	user_beast_submissions: BeastProofClaimed[];
};

const textBasedOnNotEntry = {
	pending: () => <>The proof is underpriced, we suggest bumping the fee.</>,
	verified: () => <>The proof is ready to be claimed.</>,
};

const NotificationEntry = ({
	proof,
	leaderboard_address,
	payment_service_address,
	user_address,
	batcher_url,
	user_beast_submissions,
}: {
	proof: ProofSubmission;
	leaderboard_address: Address;
	payment_service_address: Address;
	user_address: Address;
	batcher_url: string;
	user_beast_submissions: BeastProofClaimed[];
}) => {
	const { open, setOpen, toggleOpen } = useModal();

	return (
		<>
			<div className="flex flex-row w-full items-end justify-between gap-4">
				<div className="flex items-center gap-4">
					<div
						className={`rounded-full h-[10px] w-[10px] ${
							proof.status === "verified"
								? "bg-accent-100"
								: "bg-orange"
						} shrink-0`}
					></div>
					<p className="text-sm text-text-100">
						{textBasedOnNotEntry[proof.status](
							shortenHash(proof.verification_data_commitment)
						)}
					</p>
				</div>
				<Button
					variant="text-accent"
					className="text-sm text-nowrap"
					onClick={toggleOpen}
				>
					{proof.status === "verified" ? "Claim" : "Bump fee"}
				</Button>
			</div>
			<SubmitProofModal
				modal={{ open, setOpen }}
				batcher_url={batcher_url}
				leaderboard_address={leaderboard_address}
				user_address={user_address}
				payment_service_address={payment_service_address}
				userBeastSubmissions={user_beast_submissions}
				proof={proof}
			/>
		</>
	);
};

export const NotificationBell = ({
	proofs,
	leaderboard_address,
	payment_service_address,
	user_address,
	batcher_url,
	user_beast_submissions,
}: Props) => {
	const [proofsReady, setProofsReady] = useState<ProofSubmission[]>([]);
	const [allProofs, setAllProofs] = useState<ProofSubmission[]>([]);

	useEffect(() => {
		const proofsReady = proofs.filter(proof => proof.status === "verified");

		const allProofs = proofs.filter(
			proof =>
				proof.status === "verified" ||
				(proof.status === "pending" &&
					timeAgoInHs(proof.inserted_at) > 6)
		);

		setProofsReady(proofsReady);
		setAllProofs(allProofs);
	}, [proofs, setProofsReady]);

	return (
		<div className="sm:relative group">
			<div className="relative">
				<span className="hero-bell size-7"></span>
				{proofsReady.length > 0 && (
					<div className="rounded-full h-[10px] w-[10px] bg-accent-100 absolute top-0 left-0"></div>
				)}
			</div>

			<div className="pt-2">
				<div className="flex flex-col gap-8 p-8 absolute max-sm:left-0 sm:w-[400px] w-full sm:right-0 shadow-2xl bg-contrast-100 rounded opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity duration-200 z-10">
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
						{allProofs.length > 0 ? (
							allProofs.map(proof => (
								<NotificationEntry
									proof={proof}
									leaderboard_address={leaderboard_address}
									payment_service_address={
										payment_service_address
									}
									user_address={user_address}
									batcher_url={batcher_url}
									user_beast_submissions={
										user_beast_submissions
									}
								/>
							))
						) : (
							<p className="text-sm text-text-200">
								No updates at the moment. We'll notify you if
								there are any changes to the status of your
								proofs.
							</p>
						)}
					</div>
				</div>
			</div>
		</div>
	);
};
