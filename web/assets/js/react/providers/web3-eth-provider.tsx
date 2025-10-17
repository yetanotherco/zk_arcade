import React, { useEffect, useState } from "react";
import { WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ConnectKitProvider } from "connectkit";
import { configs } from "../config";

const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			retry: 1, // Disable retries
			refetchOnWindowFocus: false, // Disable refetching on tab focus
		},
	},
});

const configSelector = (config_name: string) => {
	switch (config_name) {
		case "anvil":
			return configs.ConfigAnvil();
		case "sepolia":
			return configs.ConfigSepolia();
		case "mainnet":
			return configs.ConfigMainnet();
		case "holesky":
			return configs.ConfigHolesky();
		default:
			return configs.ConfigAnvil();
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
						walletConnectName: "Wallet Connect",
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
