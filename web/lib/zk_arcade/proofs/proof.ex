defmodule ZkArcade.Proofs.Proof do
  use Ecto.Schema
  import Ecto.Changeset
  alias ZkArcade.Accounts.Wallet

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id
  schema "proofs" do
    field :verification_data, :map
    field :batch_data, :map
    # Status can be "pending", "verified", submitted or "failed"
    field :status, :string, default: "pending"
    field :game, :string, default: "beast"

    belongs_to :wallet, Wallet, foreign_key: :wallet_address, references: :address, type: :string

    timestamps()
  end

  @doc false
  def changeset(proof, attrs) do
    proof
    |> cast(attrs, [:verification_data, :wallet_address, :batch_data, :status, :game])
    |> validate_required([:verification_data, :wallet_address, :status, :game])
    |> validate_inclusion(:status, ["pending", "submitted", "failed", "claimed"])
    |> validate_inclusion(:game, ["beast", "sudoku", "parity"])
    |> foreign_key_constraint(:wallet_address)
  end
end
