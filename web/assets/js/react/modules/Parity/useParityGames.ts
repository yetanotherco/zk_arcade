import { useEffect, useMemo, useState } from "react";
import { Address, toBytes } from "viem";
import { ParityLevel } from "./types";
import { useParityLeaderboardContract } from "../../hooks/useParityLeaderboardContract";
import { useBlock } from "wagmi";

type Args = {
	leaderBoardContractAddress: Address;
	userAddress;
};

type GameStatus = {
	levelsBoards: number[][][];
	userPositions: [number, number][][];
};

export const useParityGames = ({
	leaderBoardContractAddress,
	userAddress,
}: Args) => {
	const { currentGame } = useParityLeaderboardContract({
		contractAddress: leaderBoardContractAddress,
		userAddress,
	});
	const [currentLevel, setCurrentLevel] = useState<number | null>(null);

	const gameConfig = currentGame.data?.gameConfig ?? "";

	const levels: ParityLevel[] = useMemo(() => {
		if (!gameConfig) return [];
		let gameConfigBytes = toBytes(gameConfig);
		let levels: ParityLevel[] = [];

		for (let i = 0; i < gameConfigBytes.length / 10; i++) {
			let byte_idx = i * 10;
			let initialPos: ParityLevel["initialPos"] = {
				col: gameConfigBytes[byte_idx] >> 4,
				row: gameConfigBytes[byte_idx] & 0x0f,
			};
			byte_idx += 1;
			let board: number[] = [];
			for (let j = 0; j < 9; j++) {
				board[j] = gameConfigBytes[byte_idx];
				byte_idx += 1;
			}
			levels.push({ board, initialPos });
		}
		return levels;
	}, [gameConfig]);

	const [playerLevelReached, setPlayerLevelReached] = useState(0);

	// Get the block timestamp for the current block
	const currentBlock = useBlock();

	const [timeRemaining, setTimeRemaining] = useState<{
		hours: number;
		minutes: number;
	} | null>(null);

	useEffect(() => {
		const endsAtTime = currentGame.data?.endsAtTime || 0;
		const currentBlockTimestamp = currentBlock.data
			? currentBlock.data.timestamp
			: 0;

		if (endsAtTime > 0 && currentBlockTimestamp) {
			const timeRemaining =
				Number(endsAtTime) - Number(currentBlockTimestamp);
			const hours = timeRemaining / 3600;
			const minutes = Math.floor(timeRemaining / 60);

			setTimeRemaining({
				hours: Math.floor(hours),
				minutes,
			});
		}
	}, [currentGame.data, currentBlock.data]);

	useEffect(() => {
		if (!gameConfig) {
			setPlayerLevelReached(0);
			return;
		}
		let gameData: Record<string, GameStatus> = {};
		try {
			const stored = localStorage.getItem("parity-game-data");
			gameData = stored ? JSON.parse(stored) : {};
		} catch {
			gameData = {};
		}
		const current = gameData[gameConfig];

		// TODO: do this only if the gameConfig matches the one in the contracr
		setPlayerLevelReached((current?.levelsBoards?.length ?? 0) + 1);
	}, [gameConfig]);

	return {
		playerLevelReached,
		setPlayerLevelReached,
		currentLevel,
		setCurrentLevel,
		levels,
		timeRemaining,
		currentGameConfig: gameConfig,
	};
};
