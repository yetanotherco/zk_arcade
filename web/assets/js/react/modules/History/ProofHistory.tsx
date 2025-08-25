import React, { useEffect } from "react";
import { Address } from "../../types/blockchain";
import {
	useBatcherPaymentService,
	useBeastLeaderboardContract,
	useModal,
} from "../../hooks";
import { formatEther } from "viem";
import { Table, TableBodyItem } from "../../components/Table";
import { ProofSubmission } from "../../types/aligned";
import { timeAgo } from "../../utils/date";
import { shortenHash } from "../../utils/crypto";
import { useProofSentMessageReader } from "../../hooks/useProofSentMessageReader";
import {
	ProofBatchMerkleRoot,
	ProofStatusWithTooltipDesc,
} from "../../components/Table/ProofBodyItems";
import { SubmitProofModal } from "../../components/Modal/SubmitProof";

type Props = {
	leaderboard_address: Address;
	user_address: Address;
	payment_service_address: Address;
	proofs: ProofSubmission[];
	explorer_url: string;
	batcher_url: string;
};

const Entry = ({
	payment_service_address,
	leaderboard_address,
	user_address,
	proof,
	batcher_url,
	explorer_url,
}: {
	payment_service_address: Address;
	leaderboard_address: Address;
	user_address: Address;
	proof: ProofSubmission;
	batcher_url: string;
	explorer_url: string;
}) => {
	const { open, setOpen, toggleOpen } = useModal();

	return (
		<>
			<tr
				onClick={toggleOpen}
				className="cursor-pointer gap-y-2 [&>td]:pb-2 animate-in fade-in-0 truncat transition hover:bg-contrast-100"
			>
				<td>
					<p>{proof.game} </p>
					<div
						className="group/tooltip flex flex-row gap-0.5 items-center"
						style={{ maxWidth: 50 }}
					>
						{[...Array(8)].map((_, index) => {
							return (
								<div
									key={index}
									className={`
									w-full h-[10px] mb-2
									${index < proof.level_reached ? "bg-accent-100" : "bg-contrast-100"}
									${index === 0 ? "rounded-l-[3px]" : ""}
									${index === 7 ? "rounded-r-[3px]" : ""}
									`}
								></div>
							);
						})}

						<div
							className="absolute translate-x-1/4 mt-2 bg-black text-white text-xs rounded px-2 py-1 opacity-0 group-hover/tooltip:opacity-100 transition pointer-events-none z-50"
							style={{ width: 200 }}
						>
							<p className="text-center">
								Reached level {proof.level_reached} in your last
								run
							</p>
						</div>
					</div>
				</td>
				<ProofStatusWithTooltipDesc
					proof={proof}
					explorer_url={explorer_url}
				/>
				<TableBodyItem text={timeAgo(proof.inserted_at)} />
				<ProofBatchMerkleRoot
					proof={proof}
					explorer_url={explorer_url}
				/>
				<TableBodyItem
					text={shortenHash(proof.verification_data_commitment)}
				/>
				<TableBodyItem text={proof.proving_system} />
			</tr>

			<SubmitProofModal
				modal={{ open, setOpen }}
				payment_service_address={payment_service_address}
				batcher_url={batcher_url}
				leaderboard_address={leaderboard_address}
				userBeastSubmissions={[]}
				user_address={user_address}
				proof={proof}
			/>
		</>
	);
};

export const ProofHistory = ({
	proofs,
	leaderboard_address,
	user_address,
	payment_service_address,
	explorer_url,
}: Props) => {
	useProofSentMessageReader();

	const { balance } = useBatcherPaymentService({
		contractAddress: payment_service_address,
		userAddress: user_address,
	});

	const { score } = useBeastLeaderboardContract({
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
				]}
			>
				{proofs.map((proof, idx) => (
					<Entry
						key={idx}
						batcher_url={explorer_url}
						explorer_url={explorer_url}
						leaderboard_address={leaderboard_address}
						payment_service_address={payment_service_address}
						proof={proof}
						user_address={user_address}
					/>
				))}
			</Table>
		</div>
	);
};
