defmodule ZkArcadeWeb.BeastGamesController do
  use ZkArcadeWeb, :controller
  alias ZkArcade.BeastGames

  def current(conn, _params) do
    case BeastGames.get_current_beast_game() do
      nil ->
        conn
        |> put_status(:not_found)
        |> json(%{error: "No current Beast game found"})

      game ->
        json(conn, %{
          id: game.id,
          game_index: game.game_index,
          starts_at: game.starts_at,
          ends_at: game.ends_at,
          game_config: game.game_config
        })
    end
  end

  def by_index(conn, %{"index" => index}) do
    case Integer.parse(index) do
      {game_index, ""} ->
        case BeastGames.get_beast_game_by_index(game_index) do
          nil ->
            conn
            |> put_status(:not_found)
            |> json(%{error: "Beast game with index #{game_index} not found"})

          game ->
            json(conn, %{
              id: game.id,
              game_index: game.game_index,
              starts_at: game.starts_at,
              ends_at: game.ends_at,
              game_config: game.game_config
            })
        end

      _ ->
        conn
        |> put_status(:bad_request)
        |> json(%{error: "Invalid game index"})
    end
  end
end