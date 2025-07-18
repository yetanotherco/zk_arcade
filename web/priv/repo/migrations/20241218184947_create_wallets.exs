defmodule ZkArcade.Repo.Migrations.CreateWallets do
  use Ecto.Migration

  def change do
    create table(:wallets, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :address, :string
      add :points, :integer, default: 0, null: false
      add :balance, :float, default: 0.0, null: false
      add :agreement_signature, :string

      timestamps()
    end

    create unique_index(:wallets, :address, name: :wallets_address_index)
  end
end
