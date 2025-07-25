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

  @doc """
  Updates a leaderboard entry.
  """
  def update_entry(%LeaderboardEntry{} = entry, attrs) do
    entry
    |> LeaderboardEntry.changeset(attrs)
    |> Repo.update()
  end

  @doc """
  Inserts or updates a leaderboard entry based on user address. If the user address already exists,
  updates the score. If it doesn't exist, creates a new entry.
  """
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

  @doc """
  Deletes a leaderboard entry.
  """
  def delete_entry(%LeaderboardEntry{} = entry) do
    Repo.delete(entry)
  end

  @doc """
  Returns the highest score for a user. If the user address is nil or empty, returns 0.
  """
  def get_user_score(nil), do: 0

  def get_user_score(user_address) when is_binary(user_address) do
    user_address = String.trim(user_address)

    if user_address == "" do
      nil
    else
      Repo.one(
        from(e in LeaderboardEntry, where: e.user_address == ^user_address, select: max(e.score))
      )
    end
  end

  @doc """
  Returns the top 10 users based on their scores. The result is a list of maps with user address and score,
  ordered by score in descending order.
  """
  def get_top_users do
    from(e in LeaderboardEntry,
      order_by: [desc: e.score],
      limit: 10,
      select: %{address: e.user_address, score: e.score}
    )
    |> Repo.all()
    |> Enum.with_index(1)
    |> Enum.map(fn {entry, index} ->
      Map.put(entry, :position, index)
    end)
  end
end
