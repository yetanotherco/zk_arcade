import { useQuery } from "@tanstack/react-query";

interface QuestNumberResponse {
  quest_number: number;
}

async function fetchQuestNumber(
  gameType: "beast" | "parity",
  gameIndex: number
): Promise<number> {
  const response = await fetch(
    `/api/games/${gameType}/${gameIndex}/quest-number`
  );
  
  if (!response.ok) {
    throw new Error(`Failed to fetch quest number: ${response.statusText}`);
  }

  const data: QuestNumberResponse = await response.json();
  return data.quest_number;
}

export function useQuestNumber(gameType: "beast" | "parity", gameIndex: number | bigint | undefined) {
  // Convert BigInt to number to avoid JSON.stringify errors in query key serialization
  const normalizedGameIndex = gameIndex !== undefined ? Number(gameIndex) : undefined;
  
  return useQuery({
    queryKey: ["quest-number", gameType, normalizedGameIndex],
    queryFn: () => fetchQuestNumber(gameType, normalizedGameIndex!),
    enabled: normalizedGameIndex !== undefined,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}
