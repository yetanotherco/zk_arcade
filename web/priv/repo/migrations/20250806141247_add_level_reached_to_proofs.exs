defmodule ZkArcade.Repo.Migrations.AddLevelReachedToProofs do
  use Ecto.Migration

  def change do
    alter table(:proofs) do
      add :level_reached, :integer, default: 0
      add :game_config, :string
    end
  end
end
