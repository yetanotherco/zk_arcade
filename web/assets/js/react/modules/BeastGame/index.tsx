import React from "react";
import { Address } from "../../types/blockchain.js";
import Web3EthProvider from "../../providers/web3-eth-provider.js";
import { CurrentBeastGame } from "./CurrentGame";

type Props = {
	network: string;
	leaderboard_address: Address;
	user_address: Address;
};

export default ({ network, leaderboard_address, user_address }: Props) => {
	return (
		<Web3EthProvider network={network}>
			<CurrentBeastGame
				leaderboard_address={leaderboard_address}
				user_address={user_address}
			/>
		</Web3EthProvider>
	);
};
