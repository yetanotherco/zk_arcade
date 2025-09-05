defmodule ZkArcade.MerklePaths.MerklePath do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id
  schema "merkle_paths" do
    field :address, :string
    field :merkle_proof, {:array, :string}
    field :merkle_root_index, :integer
    timestamps()
  end

  def changeset(merkle_path, attrs) do
    merkle_path
    |> cast(attrs, [:address, :merkle_proof, :merkle_root_index])
    |> validate_required([:address, :merkle_proof, :merkle_root_index])
  end
end
