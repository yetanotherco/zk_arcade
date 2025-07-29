import React from "react";
import { ConnectKitButton } from "connectkit";

export const ConnectWallet = () => {
	return (
		<ConnectKitButton.Custom>
			{({ isConnected, show, truncatedAddress, ensName }) => {
				return (
					<div className="cursor-pointer" onClick={show}>
						Connect Wallet
					</div>
				);
			}}
		</ConnectKitButton.Custom>
	);
};
