defmodule ZkArcade.Repo.Migrations.CreateProofs do
  use Ecto.Migration

  def change do
    create table(:proofs, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :verification_data, :map, null: false
      add :batch_data, :map
      add :status, :string, null: false, default: "pending"
      add :wallet_address, references(:wallets, column: :address, type: :string), null: false
      add :game, :string, null: false, default: "beast"

      timestamps()
    end

    create index(:proofs, [:wallet_address])
  end
end
