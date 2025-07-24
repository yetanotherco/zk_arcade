defmodule ZkArcade.Repo.Migrations.CreateLeaderboardEntries do
  use Ecto.Migration

  def change do
    create table(:leaderboard_entries, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :user_address, :string, null: false
      add :level, :integer, null: false
      # add :game, :string, default: "beast", null: false

      timestamps()
    end

    # Create an index on user_address for faster lookups
    create index(:leaderboard_entries, [:user_address])
  end
end
