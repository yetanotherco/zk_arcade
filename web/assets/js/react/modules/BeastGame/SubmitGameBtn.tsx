import React from "react";
import Web3EthProvider from "../../providers/web3-eth-provider";
import { Button } from "../../components/Button";
import { useModal } from "../../hooks/useModal";
import { Address } from "../../types/blockchain";
import { ToastsProvider } from "../../state/toast";
import { ToastContainer } from "../../components/Toast";
import { SubmitProofModal } from "../../components/Modal/SubmitProof";

type Props = {
	network: string;
	payment_service_address: Address;
	user_address: Address;
	batcher_url: string;
	leaderboard_address: Address;
	nft_contract_address: Address;
	highest_level_reached: any;
};

const SubmitModal = ({
	user_address,
	leaderboard_address,
	payment_service_address,
	batcher_url,
	nft_contract_address,
	highest_level_reached,
}: Omit<Props, "network">) => {
	const { open, setOpen, toggleOpen } = useModal();

	if (!user_address) return null;
	return (
		<>
			<Button variant="accent-fill" onClick={toggleOpen}>
				Submit solution proof
			</Button>
			<SubmitProofModal
				modal={{ open, setOpen }}
				batcher_url={batcher_url}
				leaderboard_address={leaderboard_address}
				payment_service_address={payment_service_address}
				user_address={user_address}
				proofToSubmitData={null}
				gameName="beast"
				nft_contract_address={nft_contract_address}
				highestLevelReached={highest_level_reached}
			/>
		</>
	);
};

export const SubmitBeastGameBtn = ({
	network,
	payment_service_address,
	user_address,
	batcher_url,
	leaderboard_address,
	nft_contract_address,
	highest_level_reached,
}: Props) => {
	const parsedHighest =
 		typeof highest_level_reached === "string"
 			? JSON.parse(highest_level_reached)
 			: highest_level_reached;
	return (
		<Web3EthProvider network={network}>
			<ToastsProvider>
				<ToastContainer />
				<SubmitModal
					payment_service_address={payment_service_address}
					user_address={user_address}
					batcher_url={batcher_url}
					leaderboard_address={leaderboard_address}
					nft_contract_address={nft_contract_address}
					highest_level_reached={parsedHighest}
				/>
			</ToastsProvider>
		</Web3EthProvider>
	);
};
