defmodule ZkArcade.Repo.Migrations.AddStatusToProofs do
  use Ecto.Migration

  def change do
    alter table(:proofs) do
      add :status, :string, null: false, default: "pending"
    end
  end
end
