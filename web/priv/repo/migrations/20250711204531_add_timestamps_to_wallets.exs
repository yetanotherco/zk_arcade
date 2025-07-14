defmodule ZkArcade.Repo.Migrations.AddTimestampsToWallets do
  use Ecto.Migration

  def change do
    alter table(:wallets) do
      timestamps()
    end
  end
end
