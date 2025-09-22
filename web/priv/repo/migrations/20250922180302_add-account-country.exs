defmodule :"Elixir.ZkArcade.Repo.Migrations.Add-account-country" do
  use Ecto.Migration

  def change do
    alter table (:wallets) do
      add :country, :string
    end
  end
end
