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

export function useQuestNumber(gameType: "beast" | "parity", gameIndex: number | undefined) {
  return useQuery({
    queryKey: ["quest-number", gameType, gameIndex],
    queryFn: () => fetchQuestNumber(gameType, gameIndex!),
    enabled: gameIndex !== undefined,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}
