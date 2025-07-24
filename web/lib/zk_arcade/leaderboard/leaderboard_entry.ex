defmodule ZkArcade.Leaderboard.LeaderboardEntry do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id
  schema "leaderboard_entries" do
    field :user_address, :string
    field :level, :integer
    #field :game, :string, default: "beast"

    timestamps()
  end

  def changeset(entry, attrs) do
    entry
    |> cast(attrs, [:user_address, :level])
    |> validate_required([:user_address, :level])
    #|> validate_inclusion(:game, ["beast", "sudoku", "parity"])
  end
end
