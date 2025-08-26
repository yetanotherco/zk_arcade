import { useChainId, useReadContract } from "wagmi";
import { Address } from "../types/blockchain";
import { leaderboardAbi } from "../constants/aligned";

type Args = {
	contractAddress: Address;
};

export const useParityLeaderboardContract = ({ contractAddress }: Args) => {
	const chainId = useChainId();

	const currentGame = useReadContract({
		address: contractAddress,
		abi: leaderboardAbi,
		functionName: "getCurrentParityGame",
		args: [],
		chainId,
	});

	return {
		currentGame: {
			...currentGame,
			gamesHaveFinished:
				currentGame.error?.message?.includes("NoActiveParityGame"),
		},
	};
};
