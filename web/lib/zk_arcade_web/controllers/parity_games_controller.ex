defmodule ZkArcadeWeb.ParityGamesController do
  use ZkArcadeWeb, :controller
  alias ZkArcade.ParityGames

  def current(conn, _params) do
    case ParityGames.get_current_parity_game() do
      nil ->
        conn
        |> put_status(:not_found)
        |> json(%{error: "No current Parity game found"})

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
        case ParityGames.get_parity_game_by_index(game_index) do
          nil ->
            conn
            |> put_status(:not_found)
            |> json(%{error: "Parity game with index #{game_index} not found"})

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