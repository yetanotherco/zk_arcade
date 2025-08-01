defmodule ZkArcade.Proofs.Proof do
  use Ecto.Schema
  import Ecto.Changeset
  alias ZkArcade.Accounts.Wallet

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id
  schema "proofs" do
    field :verification_data, :map
    field :verification_data_commitment, :map
    field :batch_data, :map
    # Status can be "pending", "verified", submitted or "failed"
    field :status, :string, default: "pending"
    field :game, :string, default: "Beast"
    field :proving_system, :string

    field :times_retried, :integer, default: 0

    belongs_to :wallet, Wallet, foreign_key: :wallet_address, references: :address, type: :string

    timestamps()
  end

  @doc false
  def changeset(proof, attrs) do
    proof
    |> cast(attrs, [:verification_data, :verification_data_commitment, :wallet_address, :batch_data, :status, :game, :proving_system, :inserted_at, :updated_at, :times_retried])
    |> validate_required([:verification_data, :verification_data_commitment, :wallet_address, :status, :game, :proving_system])
    |> validate_inclusion(:status, ["pending", "submitted", "failed", "claimed"])
    |> validate_inclusion(:game, ["Beast", "Sudoku", "Parity"])
    |> validate_inclusion(:proving_system, ["Risc0", "SP1"]) # TODO add more proving systems
    |> foreign_key_constraint(:wallet_address)
    |> update_timestamps(attrs)
  end

  defp update_timestamps(changeset, %{"inserted_at" => ins, "updated_at" => up}) do
    changeset
    |> put_change(:inserted_at, ins)
    |> put_change(:updated_at, up)
  end

  defp update_timestamps(changeset, _), do: changeset
end
