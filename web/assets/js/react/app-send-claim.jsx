import React from "react";
import Web3EthProvider from "./components/web3-eth-provider";
import ClaimSendBtn from "./components/claim-send-btn";

const AppSendClaim = (props) => {
  return (
    <Web3EthProvider network={props.network}>
      <ClaimSendBtn {...props} />
    </Web3EthProvider>
  )
}

export default AppSendClaim;
