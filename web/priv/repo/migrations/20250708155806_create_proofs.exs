defmodule ZkArcade.Repo.Migrations.CreateProofs do
  use Ecto.Migration

  def change do
    create table(:proofs, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :verification_data, :map, null: false
      add :wallet_address, references(:wallets, column: :address, type: :string), null: false

      timestamps()
    end

    create index(:proofs, [:wallet_address])
  end
end
