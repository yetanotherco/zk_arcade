defmodule ZkArcade.Leaderboard.LeaderboardEntry do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id
  schema "leaderboard_entries" do
    field :user_address, :string
    field :score, :integer

    timestamps()
  end

  def changeset(entry, attrs) do
    entry
    |> cast(attrs, [:user_address, :score])
    |> validate_required([:user_address, :score])
  end
end
