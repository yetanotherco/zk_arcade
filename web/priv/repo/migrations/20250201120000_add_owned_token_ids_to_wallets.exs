defmodule ZkArcade.Repo.Migrations.AddOwnedTokenIdsToWallets do
  use Ecto.Migration

  def change do
    alter table(:wallets) do
      add :owned_token_ids, {:array, :string}, default: [], null: false
    end
  end
end
