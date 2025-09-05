defmodule ZkArcade.MerklePaths do
  import Ecto.Query, warn: false
  alias ZkArcade.Repo

  alias ZkArcade.MerklePaths.MerklePath

  require Logger

  def create_merkle_path(address, proof) do
    %MerklePath{
      id: UUID.uuid4(),
      address: address,
      merkle_proof: proof
    }
    |> Repo.insert()
  end

  def get_merkle_path(id) do
    Repo.get(MerklePath, id)
  end

  def update_merkle_path(id, attrs) do
    id
    |> get_merkle_path()
    |> case do
      nil -> {:error, :not_found}
      merkle_path ->
        merkle_path
        |> MerklePath.changeset(attrs)
        |> Repo.update()
    end
  end

  def delete_merkle_path(id) do
    id
    |> get_merkle_path()
    |> case do
      nil -> {:error, :not_found}
      merkle_path -> Repo.delete(merkle_path)
    end
  end

  def list_merkle_paths do
    Repo.all(MerklePath)
  end

  def get_merkle_proof_for_address(address) do
    query = from(mp in MerklePath, where: mp.address == ^address)
    Logger.info("Querying Merkle proof for address: #{address} with query: #{inspect(query)}")

    case Repo.one(query) do
      nil -> {:error, :proof_not_found}
      merkle_path -> {:ok, merkle_path.merkle_proof}
    end
  end
end
