import React from "react";
import Web3EthProvider from "./components/web3-eth-provider";
import FormCheckClaim from "./components/form-check-claim";

const AppCheckClaim = (props) => {
  return (
    <Web3EthProvider network={props.network}>
      <FormCheckClaim {...props} />
    </Web3EthProvider>
  )
}

export default AppCheckClaim;
