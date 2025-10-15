import { http, createConfig } from "wagmi";
import { anvil, sepolia, mainnet, holesky } from "wagmi/chains";
import { getDefaultConfig } from "connectkit";

const common_config = {
	walletConnectProjectId: "b2fb11724ae6170bc3e2cf2d6e19ec5a",
	appName: "Zk Arcade",
};

export const getConfigs = () => ({
	ConfigAnvil: createConfig(
		getDefaultConfig({
			chains: [anvil],
			transports: {
				[anvil.id]: http(),
			},
			...common_config,
		})
	),

	ConfigSepolia: createConfig(
		getDefaultConfig({
			chains: [sepolia],
			transports: {
				[sepolia.id]: http(),
			},
			...common_config,
		})
	),

	ConfigMainnet: createConfig(
		getDefaultConfig({
			chains: [mainnet],
			transports: {
				[mainnet.id]: http(),
			},
			...common_config,
		})
	),

	ConfigHolesky: createConfig(
		getDefaultConfig({
			chains: [holesky],
			transports: {
				[holesky.id]: http(),
			},
			...common_config,
		})
	),
});
