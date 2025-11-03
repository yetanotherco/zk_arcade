import { useEffect, useMemo, useState } from "react";
import { Address, encodePacked, keccak256, toBytes } from "viem";
import { gameDataKey, ParityLevel } from "./types";
import { useParityLeaderboardContract } from "../../hooks/useParityLeaderboardContract";
import { useBlock } from "wagmi";

type Args = {
	leaderBoardContractAddress: Address;
	userAddress: Address;
};

type GameStatus = {
	levelsBoards: number[][][];
	userPositions: [number, number][][];
};

export const useParityGames = ({
	leaderBoardContractAddress,
	userAddress,
}: Args) => {
	const { currentGame, nextGame, currentGameLevelCompleted } =
		useParityLeaderboardContract({
			contractAddress: leaderBoardContractAddress,
			userAddress,
		});
	const [currentLevel, setCurrentLevel] = useState<number | null>(null);

	const gameConfig = currentGame.game?.gameConfig ?? "";

	const levels: ParityLevel[] = useMemo(() => {
		if (!gameConfig) return [];
		let gameConfigBytes = toBytes(gameConfig, { size: 32 });
		let levels: ParityLevel[] = [];

		// we substract 2 because the gameConfig only takes 30 bytes (each level takes 10 bytes and there is three per gameConfig)
		for (let i = 0; i < (gameConfigBytes.length - 2) / 10; i++) {
			// ignore the first two bytes
			let byte_idx = i * 10 + 2;
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
		days: number;
		hours: number;
		minutes: number;
	} | null>(null);

	useEffect(() => {
		const startsAtTime = nextGame.data?.startsAtTime || 0n;
		const currentBlockTimestamp = currentBlock.data
			? currentBlock.data.timestamp
			: 0;

		if (startsAtTime > 0 && currentBlockTimestamp) {
			const totalSeconds = Math.max(
				0,
				Number(startsAtTime) - Number(currentBlockTimestamp)
			);
			const days = Math.floor(totalSeconds / 86400);
			const hours = Math.floor((totalSeconds % 86400) / 3600);
			const minutes = Math.floor((totalSeconds % 3600) / 60);

			setTimeRemaining({ days, hours, minutes });
		}
	}, [nextGame.data, currentGame.data, currentBlock.data]);

	useEffect(() => {
		if (!gameConfig || !userAddress) {
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
		const key = gameDataKey(gameConfig, userAddress);
		const current = gameData[key];

		setPlayerLevelReached((current?.levelsBoards?.length ?? 0) + 1);
	}, [gameConfig]);

	return {
		currentGameLevelCompleted,
		playerLevelReached,
		setPlayerLevelReached,
		currentLevel,
		setCurrentLevel,
		levels,
		timeRemaining,
		currentGameConfig: gameConfig,
		currentGameIdx: currentGame.gameIdx,
		gamesHaveFinished: currentGame.gamesHaveFinished,
		isLoading: currentGame.isLoading,
	};
};
