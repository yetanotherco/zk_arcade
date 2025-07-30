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
    names_seed_list_1 = ["Decentralized", "Trustless", "Permissionless", "Immutable", "Transparent", "Secure", "Scalable", "Efficient", "Encrypted", "Auditable", "Interoperable", "Deterministic", "Resilient", "Succinct", "Verifiable", "Private", "Compact", "Efficient", "Anonymous", "Zk", "Transparent", "Updatable", "Robust", "Distributed", "Programmable", "Tokenized", "Decentralized", "scalable", "modular", "asynchronous", "deterministic", "parallel", "distributed", "dynamic", "stateless", "typed", "compiled", "interpreted", "declarative", "functional", "immutable", "portable", "lightweight", "robust", "secure", "encrypted", "authenticated", "reliable", "responsive", "efficient", "optimized", "resilient", "redundant", "extensible", "maintainable", "performant", "Optimistic"]
    names_seed_list_2 = ["lion", "tiger", "eagle", "wolf", "falcon", "bear", "fox", "owl", "panther", "shark", "whale", "snake", "rhino", "leopard", "jaguar", "bull", "antelope", "hawk", "cheetah", "lynx", "cougar", "crocodile", "buffalo", "scorpion", "lizard", "viper", "horse", "deer", "bison", "gorilla", "chimpanzee", "orangutan", "panda", "koala", "kangaroo", "dolphin", "octopus", "squid", "starfish", "seahorse", "jellyfish", "crab", "lobster", "shrimp", "anemone", "coral"]

    Enum.random(names_seed_list_1) <> " " <> Enum.random(names_seed_list_2)
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
end
