defmodule ZkArcade.BeastGames.BeastGame do
  use Ecto.Schema
  import Ecto.Changeset
  alias ZkArcade.Repo

  @primary_key {:id, :binary_id, autogenerate: true}
  schema "beast_games" do
    field :game_index, :integer
    field :starts_at, :utc_datetime
    field :ends_at, :utc_datetime
    field :game_config, :string

    timestamps()
  end

  def changeset(beast_game, attrs) do
    beast_game
    |> cast(attrs, [:game_index, :starts_at, :ends_at, :game_config])
    |> validate_required([:game_index, :starts_at, :ends_at, :game_config])
  end
end
