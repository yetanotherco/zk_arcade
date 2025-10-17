import React, { useEffect, useRef, useState } from "react";
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
	const unpatchRef = useRef<(() => void) | null>(null);

	useEffect(() => {
		if (typeof window === "undefined") return;

		if ((window as any).__walletConsolePatched) return;
		(window as any).__walletConsolePatched = true;

		const MATCH = /No matching key\. history:?/i;
		const originalError = console.error;
		let lastNotifiedAt = 0;

		console.error = (...args: any[]) => {
			try {
				const text = args
					.map(a => (typeof a === "string" ? a : a?.message || ""))
					.join(" ");

				if (MATCH.test(text)) {
					const now = Date.now();
					if (now - lastNotifiedAt > 3000) {
						alert("Wallet connect error, try again");
						lastNotifiedAt = now;
					}
					return;
				}
			} catch {}
			originalError(...args);
		};

		unpatchRef.current = () => {
			console.error = originalError;
			delete (window as any).__walletConsolePatched;
		};

		return () => {
			if (unpatchRef.current) unpatchRef.current();
		};
	}, []);

	return (
		<WagmiProvider config={configSelector(network)()}>
			<QueryClientProvider client={queryClient}>
				<ConnectKitProvider
					theme="auto"
					mode="light"
					options={{
						initialChainId: 1, // or your desired chain ID
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
