import React from "react";
import { useBatcherPaymentService } from "../../hooks/";
import { BalanceScoreInAligned } from "./BalanceScoreInAligned";
import { Address } from "../../types/blockchain";

type Props = {
	network: string;
	payment_service_address: Address;
	user_address: Address;
};

export const WalletInfo = ({
	payment_service_address,
	user_address,
}: Props) => {
	const { balance, sendFunds } = useBatcherPaymentService({
		contractAddress: payment_service_address,
		userAddress: user_address,
	});

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
					className="flex flex-col gap-8 px-10 py-8 absolute left-0  bg-contrast-100 rounded opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity duration-200 z-10"
					style={{ width: 400, maxHeight: 300 }}
				>
					<BalanceScoreInAligned
						payment_service_address={payment_service_address}
						user_address={user_address}
					/>

					<div>
						<h3 className="text-md font-bold mb-1">
							Your Proof Submissions:
						</h3>
						<p className="text-sm">
							You don't have any submission for now...
						</p>
					</div>
				</div>
			</div>
		</div>
	);
};
