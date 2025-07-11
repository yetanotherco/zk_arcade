import React from "react";
import Web3EthProvider from "./components/web3-eth-provider";
import ListProofs from "./components/list-proofs";

const AppListProofs = props => {
	return (
		<Web3EthProvider network={props.network}>
			<ListProofs
				user_address={props.user_address}
				proofs={props.proofs}
				{...props}
			/>
		</Web3EthProvider>
	);
};

export default AppListProofs;
