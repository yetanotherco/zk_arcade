defmodule ZkArcade.Accounts do
  @moduledoc """
  The Accounts context.
  """

  import Ecto.Query, warn: false
  alias ZkArcade.Repo

  alias ZkArcade.Accounts.Wallet

  @doc """
  Returns the list of wallets.

  ## Examples

      iex> list_wallets()
      [%Wallet{}, ...]

  """
  def list_wallets do
    Repo.all(Wallet)
  end

  @doc """
  Gets a single wallet.

  Raises `Ecto.NoResultsError` if the Wallet does not exist.

  ## Examples

      iex> get_wallet!(123)
      %Wallet{}

      iex> get_wallet!(456)
      ** (Ecto.NoResultsError)

  """
  def get_wallet!(id), do: Repo.get!(Wallet, id)

  @doc """
  Gets a single wallet by address.

  Raises `Ecto.NoResultsError` if the Wallet does not exist.

  ## Examples

      iex> fetch_wallet_by_address(123)
      {:ok, %Wallet{}}

      iex> fetch_wallet_by_address(456)
      {:error, :not_found}

  """
  def fetch_wallet_by_address(address) do
    case Repo.get_by(Wallet, address: address) do
      %Wallet{} = wallet -> {:ok, wallet}
      nil -> {:error, :not_found}
    end
  end

  def create_random_name do
    adjectives = ["Homomorphic", "Elliptic", "ZKSnarky", "Snarky", "Plonkish", "Recursive", "Succinct", "NonInteractive", "Interactive", "Merkleized", "CommitmentBased", "VerifierFriendly", "ProofCarrying", "Polynomial", "TranscriptSafe", "Poseidonic", "HashBased", "GrothFriendly", "Bulletproofed", "Immutable", "CensorshipResistant", "Permissionless", "Byzantine", "Trustless", "SybilResistant", "Deterministic", "GasEfficient", "Composable", "EVMCompatible", "Layered", "RollupNative", "Bridgeable", "Optimistic", "Finalized", "Verifiable", "Algebraic", "Linear", "Modular", "Elliptic", "Isomorphic", "Prime", "Discrete", "Finite", "Bijective", "Injective", "Surjective", "Monoidal", "Canonical", "Fractal", "Probabilistic", "Geometric", "Affine", "Spectral", "Topological"]
    animals = ["Tiger", "Fox", "Panda", "Lynx", "Wolf", "Owl", "Eagle", "Shark", "Panther", "Koala", "Cobra", "Falcon", "Rabbit", "Turtle", "Jaguar", "Bear", "Leopard", "Chameleon", "Penguin", "Sloth", "Dolphin", "Octopus", "Crab", "Lizard", "Scorpion", "Hawk", "Cheetah", "Rhino", "Buffalo", "Antelope", "Gorilla", "Chimpanzee", "Orangutan", "Bison", "Giraffe", "Kangaroo"]

    Enum.random(adjectives) <> Enum.random(animals)
  end

  @doc """
  Creates a wallet.

  ## Examples

      iex> create_wallet(%{field: value})
      {:ok, %Wallet{}}

      iex> create_wallet(%{field: bad_value})
      {:error, %Ecto.Changeset{}}

  """
  def create_wallet(attrs \\ %{}) do
    username = create_random_name()
    attrs = attrs |> Map.put_new(:username, username)

    %Wallet{}
    |> Wallet.changeset(attrs)
    |> Repo.insert()
  end

  @doc """
  Deletes a wallet.

  ## Examples

      iex> delete_wallet(wallet)
      {:ok, %Wallet{}}

      iex> delete_wallet(wallet)
      {:error, %Ecto.Changeset{}}

  """
  def delete_wallet(%Wallet{} = wallet) do
    Repo.delete(wallet)
  end

  @doc """
  Returns an `%Ecto.Changeset{}` for tracking wallet changes.

  ## Examples

      iex> change_wallet(wallet)
      %Ecto.Changeset{data: %Wallet{}}

  """
  def change_wallet(%Wallet{} = wallet, attrs \\ %{}) do
    Wallet.changeset(wallet, attrs)
  end

  def get_wallet_username(address) do
    case fetch_wallet_by_address(address) do
      {:ok, wallet} -> wallet.username
      {:error, :not_found} -> nil
    end
  end

  def set_wallet_username(address, username) do
    case fetch_wallet_by_address(address) do
      {:ok, wallet} ->
        changeset = Wallet.changeset(wallet, %{username: username})
        case Repo.update(changeset) do
          {:ok, updated_wallet} -> {:ok, updated_wallet}
          {:error, changeset} -> {:error, changeset}
        end

      {:error, :not_found} -> {:error, :not_found}
    end
  end
end
