defmodule ZkArcade.Repo.Migrations.AddGamesTables do
  use Ecto.Migration

  def change do
    create table(:beast_games, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :game_index, :integer, null: false
      add :starts_at, :utc_datetime, null: false
      add :ends_at, :utc_datetime, null: false
      add :game_config, :string, null: false

      timestamps()
    end

    create table(:parity_games, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :game_index, :integer, null: false
      add :starts_at, :utc_datetime, null: false
      add :ends_at, :utc_datetime, null: false
      add :game_config, :string, null: false

      timestamps()
    end
  end
end
