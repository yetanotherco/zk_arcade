import React, { useEffect, useRef } from "react";
import { BalanceScoreInAligned } from "./BalanceScoreInAligned";
import { Address } from "../../types/blockchain";
import { ProofSubmissions } from "./ProofSubmissions";
import { ProofSubmission } from "../../types/aligned";
import { Button } from "../../components";
import { useDisconnect } from "wagmi";
import { useNftContract } from "../../hooks/useNftContract";

type Props = {
	network: string;
	payment_service_address: Address;
	leaderboard_address: Address;
	nft_contract_address: Address;
	user_address: Address;
	proofs: ProofSubmission[];
	username: string;
	user_position: number;
	explorer_url: string;
	batcher_url: string;
	is_eligible: boolean;
};

export const WalletInfo = ({
	payment_service_address,
	nft_contract_address,
	leaderboard_address,
	user_address,
	proofs,
	username,
	user_position,
	explorer_url,
	batcher_url,
	is_eligible,
}: Props) => {
	const formRef = useRef<HTMLFormElement>(null);
	const { balance } = useNftContract({
		contractAddress: nft_contract_address,
		userAddress: user_address,
	});
	const { disconnect } = useDisconnect();

	const handleDisconnect = () => {
		disconnect();
		formRef.current?.submit();
	};

	const eligibilityClasses = is_eligible
		? "bg-green-50 border-green-300 text-green-900"
		: "bg-amber-50 border-amber-300 text-amber-900";

	const eligibilityIcon = is_eligible
		? "hero-badge-check"
		: "hero-exclamation-triangle";

	const eligibilityText = is_eligible
		? "You are eligible to mint the NFT and participate in the contest."
		: "You are not currently eligible to mint the NFT or participate in the contest.";

	return (
		<div className="sm:relative group">
			<div className="flex flex-row items-center gap-3">
				<div>
					<p className="text-xs">Connected:</p>
					<p className="font-bold text-md">
						{`${user_address.slice(0, 5)}...${user_address.slice(
							-4
						)}`}
					</p>
				</div>
				<span className="hero-chevron-down size-3.5 group-hover:-rotate-180 transition duration-300" />
			</div>

			<div className="pt-2">
				<div
					className="overflow-scroll flex flex-col gap-8 p-8 absolute max-sm:left-0 sm:w-[450px] w-full sm:right-0 shadow-2xl bg-contrast-100 rounded opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity duration-200 z-10"
					style={{ maxHeight: 450 }}
				>
					<div className="flex gap-2 items-center">
						<span className="hero-user" />
						<a href="/history" className="text-lg hover:underline">
							{username}{" "}
							{user_position === null
								? "(#None)"
								: `(#${user_position})`}
						</a>
						<div>
							<form
								ref={formRef}
								action="/wallet/disconnect"
								method="get"
								className="hidden"
							/>
							<Button
								variant="text"
								className="text-red text-sm"
								onClick={handleDisconnect}
							>
								Disconnect
							</Button>
						</div>
					</div>

					{balance.data === 0n && (
						<div
							className={`flex items-start gap-2 border rounded p-3 ${eligibilityClasses}`}
						>
							<span
								className={`${eligibilityIcon} shrink-0 mt-0.5`}
							/>
							<p className="text-sm leading-5">
								{eligibilityText}
							</p>
						</div>
					)}

					<BalanceScoreInAligned
						payment_service_address={payment_service_address}
						leaderboard_address={leaderboard_address}
						user_address={user_address}
					/>

					<ProofSubmissions
						proofs={proofs}
						leaderboard_address={leaderboard_address}
						payment_service_address={payment_service_address}
						explorer_url={explorer_url}
						user_address={user_address}
						batcher_url={batcher_url}
					/>
				</div>
			</div>
		</div>
	);
};
