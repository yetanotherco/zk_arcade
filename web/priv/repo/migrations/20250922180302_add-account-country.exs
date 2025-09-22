defmodule :"Elixir.ZkArcade.Repo.Migrations.Add-account-country" do
  use Ecto.Migration

  def change do
    alter table (:accounts) do
      add :country, :string
    end
  end
end
