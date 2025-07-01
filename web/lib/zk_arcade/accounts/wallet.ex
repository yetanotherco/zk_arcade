defmodule ZkArcade.Accounts.Wallet do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id
  schema "wallets" do
    field :address, :string
    # TODO: Add the required fields to use in wallets
  end

  @doc false
  def changeset(wallet, attrs) do
    wallet
    |> cast(attrs, [:address])
    |> validate_address()
    |> validate_required([:address])
    |> unique_constraint(:address, name: :wallets_address_index)
  end

  defp validate_address(changeset) do
    ethereum_address_regex = ~r/^(0x)?[0-9a-fA-F]{40}$/
    max_length = 42

    changeset
    |> validate_format(:address, ethereum_address_regex, message: "must be an ethereum valid address")
    |> validate_length(:address, max: max_length)
  end
end
