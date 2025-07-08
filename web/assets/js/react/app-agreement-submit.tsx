import React from "react";
import Web3EthProvider from "./components/web3-eth-provider";
import FormAgreementSubmit from "./components/form-agreement-submit";

const AppAgreementSubmit = props => {
	return (
		<Web3EthProvider network={props.network}>
			<FormAgreementSubmit {...props} />
		</Web3EthProvider>
	);
};

export default AppAgreementSubmit;
