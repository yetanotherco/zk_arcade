defmodule ZkArcade.ParityGames do
  import Ecto.Query, warn: false
  alias ZkArcade.Repo
  alias ZkArcade.ParityGames.ParityGame

  # On levels overlapping, return the one with the greatest starts_at
  def get_current_parity_game do
    now = DateTime.utc_now()

    ParityGame
    |> where([pg], pg.starts_at <= ^now and pg.ends_at >= ^now)
    |> order_by([pg], desc: pg.starts_at)
    |> limit(1)
    |> Repo.one()
  end

  def get_parity_game_by_index(game_index) do
    ParityGame
    |> where([pg], pg.game_index == ^game_index)
    |> Repo.one()
  end

  def get_game_indices_count do
    ParityGame
    |> select([pg], count(pg.game_index, :distinct))
    |> Repo.one()
  end

  def get_all_games() do
    ParityGame
    |> order_by([pg], asc: pg.starts_at)
    |> Repo.all()
  end

  def get_deduplicated_quest_number(game_index) do
    all_games = get_all_games()
    
    # Build config map from all games
    config_map = 
      all_games
      |> Enum.reduce(%{}, fn game, acc ->
        case Map.get(acc, game.game_config) do
          nil -> Map.put(acc, game.game_config, game.game_index + 1)
          _ -> acc  # Keep the first occurrence
        end
      end)
    
    # Find the game with the given index and return its deduplicated quest number
    game = get_parity_game_by_index(game_index)
    if game do
      Map.get(config_map, game.game_config, game_index + 1)
    else
      game_index + 1  # Fallback
    end
  end

end
