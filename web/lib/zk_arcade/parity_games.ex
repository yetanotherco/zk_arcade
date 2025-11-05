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
end
