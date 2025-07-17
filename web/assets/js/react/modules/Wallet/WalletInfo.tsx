import React, { useEffect, useRef } from "react";
import { BalanceScoreInAligned } from "./BalanceScoreInAligned";
import { Address } from "../../types/blockchain";
import { ProofSubmissions } from "./ProofSubmissions";
import { ProofSubmission } from "../../types/aligned";
import { Button } from "../../components";

type Props = {
	network: string;
	payment_service_address: Address;
	leaderboard_address: Address;
	user_address: Address;
	proofs: ProofSubmission[];
};

export const WalletInfo = ({
	payment_service_address,
	leaderboard_address,
	user_address,
	proofs,
}: Props) => {
	const formRef = useRef<HTMLFormElement>(null);

	const handleDisconnect = () => {
		formRef.current?.submit();
	};

	return (
		<div className="relative group">
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
					className="flex flex-col gap-8 p-8 absolute right-0  bg-contrast-100 rounded opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity duration-200 z-10"
					style={{ width: 400, maxHeight: 400 }}
				>
					<BalanceScoreInAligned
						payment_service_address={payment_service_address}
						leaderboard_address={leaderboard_address}
						user_address={user_address}
					/>
					<ProofSubmissions
						proofs={proofs}
						leaderboard_address={leaderboard_address}
					/>
					<div>
						<form
							ref={formRef}
							action="/wallet/disconnect"
							className="hidden"
						></form>
						<Button
							variant="text"
							className="text-red text-sm"
							onClick={handleDisconnect}
						>
							Disconnect
						</Button>
					</div>
				</div>
			</div>
		</div>
	);
};
