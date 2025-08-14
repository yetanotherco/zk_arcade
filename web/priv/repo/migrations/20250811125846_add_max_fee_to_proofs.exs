defmodule ZkArcade.Repo.Migrations.AddMaxFeeToProofs do
  use Ecto.Migration

  def change do
    alter table(:proofs) do
      add :submitted_max_fee, :string, default: "0"
    end
  end
end
