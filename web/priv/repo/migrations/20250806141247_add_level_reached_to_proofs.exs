defmodule ZkArcade.Repo.Migrations.AddLevelReachedToProofs do
  use Ecto.Migration

  def change do
    alter table(:proofs) do
      add :level_reached, :integer, default: 0
    end
  end
end
