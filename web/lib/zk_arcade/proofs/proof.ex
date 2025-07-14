defmodule ZkArcade.Proofs.Proof do
  use Ecto.Schema
  import Ecto.Changeset
  alias ZkArcade.Accounts.Wallet

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id
  schema "proofs" do
    # TODO: Store the commitments and th epub inputs instead of all the verification data
    field :verification_data, :map
    field :batch_data, :map
    belongs_to :wallet, Wallet, foreign_key: :wallet_address, references: :address, type: :string

    timestamps()
  end

  @doc false
  def changeset(proof, attrs) do
    proof
    |> cast(attrs, [:verification_data, :wallet_address, :batch_data])
    |> validate_required([:verification_data, :wallet_address])
    |> foreign_key_constraint(:wallet_address)
  end
end
