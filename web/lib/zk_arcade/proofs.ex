defmodule ZkArcade.Proofs do
  @moduledoc """
  The Proofs context.
  """

  import Ecto.Query, warn: false
  alias ZkArcade.Repo
  alias ZkArcade.Proofs.Proof
  alias ZkArcade.Accounts

  @doc """
  Returns the list of proofs.

  ## Examples

      iex> list_proofs()
      [%Proof{}, ...]

  """
  def list_proofs do
    Repo.all(Proof)
  end

  @doc """
  Gets a single proof.

  Raises `Ecto.NoResultsError` if the Proof does not exist.

  ## Examples

      iex> get_proof!(123)
      %Proof{}

      iex> get_proof!(456)
      ** (Ecto.NoResultsError)

  """
  def get_proof!(id), do: Repo.get!(Proof, id)

  @doc """
  Gets proofs by wallet address.

  ## Examples

      iex> get_proofs_by_address("0x123...")
      [%Proof{}, ...]

  """
  def get_proofs_by_address(address) do
    downcased_addr = String.downcase(address)
    from(p in Proof, where: p.wallet_address == ^downcased_addr)
    |> Repo.all()
  end

  @doc """
  Creates a proof and ensures the wallet exists.

  ## Examples

      iex> create_proof(%{verification_data: %{}, wallet_address: "0x123..."})
      {:ok, %Proof{}}

      iex> create_proof(%{verification_data: %{}, wallet_address: "invalid"})
      {:error, %Ecto.Changeset{}}

  """
  def create_proof(attrs \\ %{}) do
    with {:ok, _wallet} <- get_or_create_wallet(attrs["wallet_address"] || attrs[:wallet_address]) do
      %Proof{}
      |> Proof.changeset(attrs)
      |> Repo.insert()
    end
  end

  @doc """
  Deletes a proof.

  ## Examples

      iex> delete_proof(proof)
      {:ok, %Proof{}}

      iex> delete_proof(proof)
      {:error, %Ecto.Changeset{}}

  """
  def delete_proof(%Proof{} = proof) do
    Repo.delete(proof)
  end

  @doc """
  Returns an `%Ecto.Changeset{}` for tracking proof changes.

  ## Examples

      iex> change_proof(proof)
      %Ecto.Changeset{data: %Proof{}}

  """
  def change_proof(%Proof{} = proof, attrs \\ %{}) do
    Proof.changeset(proof, attrs)
  end

  defp get_or_create_wallet(address) when is_binary(address) do
    case Accounts.fetch_wallet_by_address(address) do
      {:ok, wallet} ->
        {:ok, wallet}
      {:error, :not_found} ->
        case Accounts.create_wallet(%{address: address}) do
          {:ok, wallet} -> {:ok, wallet}
          {:error, changeset} -> {:error, changeset}
        end
    end
  end

  defp get_or_create_wallet(_), do: {:error, :invalid_address}
end
