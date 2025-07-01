defmodule ZkArcade.Repo.Migrations.CreateWallets do
  use Ecto.Migration

  def change do
    create table(:wallets, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :address, :string
      add :amount, :string
      add :merkle_proof, :text
    end

    create unique_index(:wallets, :address, name: :wallets_address_index)
  end
end
