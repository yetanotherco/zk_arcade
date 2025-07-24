defmodule ZkArcade.Leaderboard do
  @moduledoc """
  The Leaderboard context.
  """

  import Ecto.Query, warn: false
  alias ZkArcade.Repo
  require Logger

  alias ZkArcade.Leaderboard.LeaderboardEntry

  @doc """
  Returns the list of leaderboard entries.
  """
  def list_entries do
    Repo.all(LeaderboardEntry)
  end

  @doc """
  Gets a single leaderboard entry by ID.
  """
  def get_entry!(id), do: Repo.get!(LeaderboardEntry, id)

  def add_entry(attrs \\ %{}) do
    %LeaderboardEntry{}
    |> LeaderboardEntry.changeset(attrs)
    |> Repo.insert()
  end

  def delete_entry(%LeaderboardEntry{} = entry) do
    Repo.delete(entry)
  end

  def get_user_highest_level(user_address) do
    from(e in LeaderboardEntry, where: e.user_address == ^user_address)
    |> Repo.aggregate(:max, :level)
  end

  def get_users_by_highest_level do
    from(e in LeaderboardEntry,
      select: {e.user_address, max(e.level)},
      group_by: e.user_address,
      order_by: [desc: max(e.level)]
    )
    |> Repo.all()
    |> Enum.with_index(1)
    |> Enum.map(fn {{address, score}, index} ->
      %{position: index, address: address, score: score}
    end)
  end
end
