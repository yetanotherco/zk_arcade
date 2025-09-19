defmodule ZkArcade.Repo.Migrations.AddClaimTxHashToProofs do
  use Ecto.Migration

  def change do
    alter table(:proofs) do
      add :claim_tx_hash, :string
    end
  end
end
