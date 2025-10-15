import React, { useEffect, useState } from "react";
import { WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ConnectKitProvider } from "connectkit";
import { getConfigs } from "../config";

const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			retry: 1, // Disable retries
			refetchOnWindowFocus: false, // Disable refetching on tab focus
		},
	},
});

const configSelector = (config_name: string) => {
	const { ConfigAnvil, ConfigHolesky, ConfigSepolia, ConfigMainnet } =
		getConfigs();
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

const FLAG = "__wc_cleanup_done__";
const w = window as any;

const Web3EthProvider = ({
	children,
	network,
}: {
	children: React.ReactNode;
	network: string;
}) => {
	const [flagValue, setFlagValue] = useState(w[FLAG]);

	useEffect(() => {
		const handleChange = () => {
			console.log("HELLO WORLD!", w["__wc_cleanup_done__"]);
			setFlagValue(w[FLAG]);
		};

		window.addEventListener("flagChange", handleChange);

		return () => {
			window.removeEventListener("flagChange", handleChange);
		};
	}, []);

	if (!flagValue) return null;

	return (
		<WagmiProvider config={configSelector(network)}>
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
	);
};

export default Web3EthProvider;
