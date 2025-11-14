import React from "react";
import { ProofSubmission } from "../../types/aligned";
import { Address } from "../../types/blockchain";
import { TableBodyItem } from "../../components/Table";
import {
	ProofBatchMerkleRoot,
	ProofStatusWithTooltipDesc,
} from "../../components/Table/ProofBodyItems";
import { useModal } from "../../hooks/useModal";
import { SubmitProofModal } from "../../components/Modal/SubmitProof";

type ProofProps = {
	proof: ProofSubmission;
	batcher_url: string;
	leaderboard_address: Address;
	payment_service_address: Address;
	user_address: Address;
	explorer_url: string;
	nft_contract_address: Address;
	highest_level_reached: number;
	public_nft_contract_address: Address;
};

const Proof = ({
	proof,
	explorer_url,
	batcher_url,
	leaderboard_address,
	payment_service_address,
	nft_contract_address,
	user_address,
	highest_level_reached,
	public_nft_contract_address,
}: ProofProps) => {
	const { open, setOpen, toggleOpen } = useModal();
	const proofHashShorten = `${proof.verification_data_commitment.slice(
		0,
		2
	)}...${proof.verification_data_commitment.slice(-4)}`;

	return (
		<>
			<tr
				className="cursor-pointer hover:bg-contrast-200 transition-colors"
				onClick={toggleOpen}
			>
				<TableBodyItem text={proof.game} />
				<ProofStatusWithTooltipDesc
					proof={proof}
					explorer_url={explorer_url}
				/>
				<ProofBatchMerkleRoot
					proof={proof}
					explorer_url={explorer_url}
				/>
				<TableBodyItem text={proofHashShorten} />
			</tr>
			<SubmitProofModal
				modal={{ open, setOpen }}
				proof={proof}
				batcher_url={batcher_url}
				leaderboard_address={leaderboard_address}
				payment_service_address={payment_service_address}
				user_address={user_address}
				proofToSubmitData={null}
				nft_contract_address={nft_contract_address}
				public_nft_contract_address={public_nft_contract_address}
				gameIdx={proof.game_idx}
				highestLevelReached={highest_level_reached}
				gameName={proof.game}
			/>
		</>
	);
};

type Props = {
	proofs: ProofSubmission[];
	leaderboard_address: Address;
	user_address: Address;
	payment_service_address: Address;
	nft_contract_address: Address;
	public_nft_contract_address: Address;
	explorer_url: string;
	batcher_url: string;
	highest_level_reached: number;
};

export const ProofSubmissions = ({
	proofs = [],
	batcher_url,
	explorer_url,
	leaderboard_address,
	nft_contract_address,
	user_address,
	payment_service_address,
	highest_level_reached,
	public_nft_contract_address,
}: Props) => {
	return (
		<div>
			<div className="flex justify-between mb-6">
				<h3 className="text-md font-bold">Your Proof Submissions:</h3>
				<div className="cursor-pointer group/proof-submission">
					<a
						href="/history"
						className="text-text-100 mr-2 text-sm group-hover/proof-submission:underline"
					>
						See all
					</a>
					<span className="hero-arrow-long-right size-5 transition group-hover/proof-submission:translate-x-0.5" />
				</div>
			</div>
			<div
				className="overflow-scroll"
				style={{ maxHeight: 100, minHeight: 50 }}
			>
				{proofs.length > 0 ? (
					<div>
						<table className="w-full text-left">
							<thead className="text-text-200 text-sm">
								<tr>
									<th>Game</th>
									<th>Status</th>
									<th>Batch</th>
									<th>Proof hash</th>
								</tr>
							</thead>
							<tbody className="text-text-100 text-sm">
								{proofs.map(item => {
									const proof = { ...item };

									return (
										<Proof
											key={proof.id}
											proof={proof}
											explorer_url={explorer_url}
											batcher_url={batcher_url}
											leaderboard_address={
												leaderboard_address
											}
											payment_service_address={
												payment_service_address
											}
											user_address={user_address}
											nft_contract_address={
												nft_contract_address
											}
											highest_level_reached={
												highest_level_reached
											}
											public_nft_contract_address={
												public_nft_contract_address
											}
										/>
									);
								})}
							</tbody>
						</table>
					</div>
				) : (
					<p className="text-sm">
						You don't have any submission for now...
					</p>
				)}
			</div>
		</div>
	);
};
