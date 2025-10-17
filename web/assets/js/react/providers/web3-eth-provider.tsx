import React, { useEffect, useState } from "react";
import { WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ConnectKitProvider } from "connectkit";
import {
	ConfigAnvil,
	ConfigSepolia,
	ConfigMainnet,
	ConfigHolesky,
} from "../config";

const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			retry: 1, // Disable retries
			refetchOnWindowFocus: false, // Disable refetching on tab focus
		},
	},
});

const configSelector = config_name => {
	switch (config_name) {
		case "anvil":
			return ConfigAnvil;
		case "sepolia":
			return ConfigSepolia;
		case "mainnet":
			return ConfigMainnet;
		case "holesky":
			return ConfigHolesky;
		default:
			return ConfigAnvil;
	}
};

const Web3EthProvider = ({ children, network }) => {
	const [errorLogOverriden, setErrorLogOverriden] = useState(false);

	const notifyWalletConnectError = () => {
		alert("Wallet connect error, try again");
	};

	useEffect(() => {
		const MATCH = /No matching key\. history:?/i;
		const originalError = console.error;
		console.error = (...args) => {
			console.log("CONSOLE ERROR ARGS", args);
			try {
				const text = args
					.map(a => (typeof a === "string" ? a : a?.message || ""))
					.join(" ");

				if (MATCH.test(text)) {
					notifyWalletConnectError();
					return;
				}
			} catch {}
			originalError(...args);
		};

		setErrorLogOverriden(true);
	}, []);

	if (!errorLogOverriden) return null;

	return (
		<>
			<WagmiProvider config={configSelector(network)()}>
				<QueryClientProvider client={queryClient}>
					<ConnectKitProvider
						theme="auto"
						mode="light"
						options={{
							initialChainId: 0,
							walletConnectName: "ZK Arcade",
							enforceSupportedChains: true,
							disclaimer:
								"By connecting your wallet, you agree to the Terms of Service and Privacy Policy.",
							overlayBlur: 0,
							embedGoogleFonts: false,
						}}
					>
						{children}
					</ConnectKitProvider>
				</QueryClientProvider>
			</WagmiProvider>
		</>
	);
};

export default Web3EthProvider;
