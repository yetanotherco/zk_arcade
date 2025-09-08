defmodule ZkArcade.Repo.Migrations.AddMerklePaths do
  use Ecto.Migration

  def change do
    create table(:merkle_paths, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :address, :string, null: false
      add :merkle_proof, {:array, :string}, null: false
      add :merkle_root_index, :integer, null: false
    end

    create unique_index(:merkle_paths, :address, name: :merkle_paths_address_index)
  end
end
