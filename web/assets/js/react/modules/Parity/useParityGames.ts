import { useEffect, useState } from "react";
import { Address, toBytes } from "viem";
import { ParityLevel } from "./types";
import { useParityLeaderboardContract } from "../../hooks/useParityLeaderboardContract";

type Args = {
	leaderBoardContractAddress: Address;
};

export const useParityGames = ({ leaderBoardContractAddress }: Args) => {
	const { currentGame } = useParityLeaderboardContract({
		contractAddress: leaderBoardContractAddress,
	});
	const [currentLevel, setCurrentLevel] = useState<number | null>(null);
	const [levels, setLevels] = useState<ParityLevel[]>([]);

	const [currentGameConfig, setCurrentGameConfig] = useState<string>("");


	useEffect(() => {
		if (!currentGame.data) {
			return;
		}

		let gameConfigBytes = toBytes(currentGame.data.gameConfig);

		setCurrentGameConfig(currentGame.data.gameConfig);

		let levels: ParityLevel[] = [];

		for (let i = 0; i < gameConfigBytes.length / 10; i++) {
			let byte_idx = i * 10;
			let initialPos: ParityLevel["initialPos"] = { col: 0, row: 0 };
			initialPos.col = gameConfigBytes[byte_idx] >> 4;
			initialPos.row = gameConfigBytes[byte_idx] & 0xf;
			byte_idx += 1;
			let board = [];
			for (let j = 0; j < 9; j++) {
				board[j] = gameConfigBytes[byte_idx];
				byte_idx += 1;
			}
			levels.push({ board, initialPos });
		}

		setLevels(levels);
	}, [currentGame.data, currentGameConfig]);

	const playerLevelReached = 1;
	const renewsIn = new Date();

	return {
		playerLevelReached,
		currentLevel,
		setCurrentLevel,
		levels,
		renewsIn,
		currentGameConfig
	};
};
