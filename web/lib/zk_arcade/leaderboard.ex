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

  def update_entry(%LeaderboardEntry{} = entry, attrs) do
    entry
    |> LeaderboardEntry.changeset(attrs)
    |> Repo.update()
  end

  def insert_or_update_entry(attrs) do
    user_address = Map.get(attrs, "user_address")
    score = Map.get(attrs, "score")

    case Repo.get_by(LeaderboardEntry, user_address: user_address) do
      nil ->
        add_entry(attrs)

      %LeaderboardEntry{} = entry ->
        update_entry(entry, %{score: score})
    end
  end

  def delete_entry(%LeaderboardEntry{} = entry) do
    Repo.delete(entry)
  end

  def get_user_score(nil), do: 0
  def get_user_score(user_address) when is_binary(user_address) do
    user_address = String.trim(user_address)
    if user_address == "" do
      nil
    else
      Repo.one(from e in LeaderboardEntry, where: e.user_address == ^user_address, select: max(e.score))
    end
  end

  def get_top_users do
    from(e in LeaderboardEntry,
      group_by: e.user_address,
      order_by: [desc: sum(e.score)],
      select: {e.user_address, sum(e.score)}
    )
    |> Repo.all()
    |> Enum.with_index(1)
    |> Enum.map(fn {{address, score}, index} ->
      %{position: index, address: address, score: score}
    end)
  end

end
