defmodule ZkArcade.BeastGames do
  import Ecto.Query, warn: false
  alias ZkArcade.Repo
  alias ZkArcade.BeastGames.BeastGame

  # On levels overlapping, return the one with the greatest starts_at
  def get_current_beast_game do
    now = DateTime.utc_now()

    BeastGame
    |> where([bg], bg.starts_at <= ^now and bg.ends_at >= ^now)
    |> order_by([bg], desc: bg.starts_at)
    |> limit(1)
    |> Repo.one()
  end

  def get_beast_game_by_index(game_index) do
    BeastGame
    |> where([bg], bg.game_index == ^game_index)
    |> Repo.one()
  end
end
