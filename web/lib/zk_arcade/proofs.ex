defmodule ZkArcade.Proofs do
  @moduledoc """
  The Proofs context.
  """

  import Ecto.Query, warn: false
  alias ZkArcade.Repo
  alias ZkArcade.Proofs.Proof
  alias ZkArcade.Accounts

  require Logger
  @doc """
  Returns the total count of proofs.

  ## Examples

      iex> list_proofs()
      42

  """
  def list_proofs do
    Repo.aggregate(Proof, :count, :id)
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
  Gets a proof by ID.

  ## Examples

      iex> get_proof_by_id("123")
      %Proof{}

      iex> get_proof_by_id("456")
      nil
  """
  def get_proof_by_id(id) do
    Repo.get(Proof, id)
  end

  @doc """
  Gets proofs by wallet address.

  ## Examples

      iex> get_proofs_by_address("0x123...")
      [%Proof{}, ...]

  """
  def get_proofs_by_address(nil), do: []
  def get_proofs_by_address(address) do
    downcased_addr = String.downcase(address)
    from(p in Proof, where: p.wallet_address == ^downcased_addr, limit: 10)
    |> Repo.all()
  end

  def get_proofs_by_address(nil, _), do: []
  def get_proofs_by_address(address, %{page: page, page_size: size}) do
    downcased_addr = String.downcase(address)

    Proof
      |> where([p], p.wallet_address == ^downcased_addr)
      |> order_by([p], desc: p.inserted_at)
      |> limit(^size)
      |> offset(^((page - 1) * size))
      |> select([p], %{
        id: p.id,
        verification_data_commitment: fragment("?->>'commitment'", p.verification_data_commitment),
        batch_hash: fragment("?->>'batch_merkle_root'", p.batch_data),
        status: p.status,
        game: p.game,
        proving_system: p.proving_system,
        inserted_at: p.inserted_at,
        updated_at: p.updated_at,
        wallet_address: p.wallet_address,
        level_reached: p.level_reached,
        game_config: p.game_config,
        submitted_max_fee: p.submitted_max_fee,
        game_idx: p.game_idx,
        claim_tx_hash: p.claim_tx_hash
      })
      |> Repo.all()
      |> Enum.map(fn proof ->
        hex_batch_hash =
          case proof.batch_hash do
            nil -> nil

            string when is_binary(string) ->
              with {:ok, list} <- Jason.decode(string),
                  true <- is_list(list) do
                "0x" <> (:erlang.list_to_binary(list) |> Base.encode16(case: :lower))
              else
                _ -> nil
              end

            _ -> nil
          end

        Map.put(proof, :batch_hash, hex_batch_hash)
      end)
  end

  def get_total_proofs_by_address(nil), do: 0
  def get_total_proofs_by_address(address) do
    downcased_addr = String.downcase(address)
    from(p in Proof, where: p.wallet_address == ^downcased_addr)
    |> Repo.aggregate(:count, :id)
  end

  def get_pending_proofs_to_bump(nil), do: []
  def get_pending_proofs_to_bump(address) do
    downcased_addr = String.downcase(address)

    Proof
      |> where([p], p.wallet_address == ^downcased_addr and p.status == "pending")
      |> order_by([p], asc: p.inserted_at)
      |> select([p], %{
        id: p.id,
        status: p.status,
        inserted_at: p.inserted_at,
        updated_at: p.updated_at,
      })
      |> Repo.all()
  end

  def get_proof_submission(proof_id) do
    query =
      from p in Proof,
        where: p.id == ^proof_id,
        select: %{
          id: p.id,
          verification_data_commitment: fragment("?->>'commitment'", p.verification_data_commitment),
          batch_hash: fragment("?->>'batch_merkle_root'", p.batch_data), # text JSON
          status: p.status,
          game: p.game,
          proving_system: p.proving_system,
          inserted_at: p.inserted_at,
          updated_at: p.updated_at,
          wallet_address: p.wallet_address,
          level_reached: p.level_reached,
          game_config: p.game_config,
          submitted_max_fee: p.submitted_max_fee,
          game_idx: p.game_idx,
          claim_tx_hash: p.claim_tx_hash
        }

    case Repo.one(query) do
      nil ->
        nil

      proof ->
        hex_batch_hash =
          case proof.batch_hash do
            nil -> nil

            string when is_binary(string) ->
              with {:ok, list} <- Jason.decode(string),
                  true <- is_list(list) do
                "0x" <> (:erlang.list_to_binary(list) |> Base.encode16(case: :lower))
              else
                _ -> nil
              end

            _ -> nil
          end
        %{proof | batch_hash: hex_batch_hash}
    end
  end

  def get_status(proof_id) do
    Proof
      |> where([p], p.id == ^proof_id)
      |> select([p], %{
        status: p.status
      })
      |> Repo.one()
  end

  def get_proof_verification_data(proof_id) do
    Proof
      |> where([p], p.id == ^proof_id)
      |> select([p], %{
        id: p.id,
        verification_data: p.verification_data,
        batch_data: p.batch_data,
        game_idx: p.game_idx
      })
    |> Repo.all()
  end

  def get_highest_level_proof(address, game_idx, game) do
    downcased_addr = String.downcase(address)
    six_hours_ago = DateTime.add(DateTime.utc_now(), -21600, :second)

    Proof
      |> where(
        [p],
        p.wallet_address == ^downcased_addr and p.game_idx == ^game_idx and p.game == ^game and
          (
            (p.status not in ["failed", "pending"]) or
            # This means we only consider those pending proofs that were submitted in the last 6 hours
            (p.status == "pending" and p.inserted_at > ^six_hours_ago)
          )
      )
      |> order_by([p], desc: p.level_reached)
      |> limit(1)
      |> Repo.one()
  end

  def create_pending_proof(submit_proof_message, address, game, proving_system, gameConfig, level, max_fee, game_idx) do
    {:ok, verification_data_commitment} = ZkArcade.VerificationDataCommitment.compute_verification_data_commitment(submit_proof_message["verificationData"]["verificationData"])
    proof_params = %{
      wallet_address: address,
      verification_data: submit_proof_message["verificationData"],
      verification_data_commitment: verification_data_commitment,
      status: "pending",
      batch_data: nil,
      game: game,
      proving_system: proving_system,
      game_config: gameConfig,
      level_reached: level,
      submitted_max_fee: max_fee,
      game_idx: game_idx
    }

    create_proof(proof_params)
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

  def update_proof_status_submitted(proof_id, batch_data) do
    proof = get_proof!(proof_id)

    changeset = change_proof(proof, %{status: "submitted", batch_data: batch_data})

    case Repo.update(changeset) do
      {:ok, updated_proof} ->
        Logger.info("Updated proof #{proof_id} status to submitted")
        {:ok, updated_proof}

      {:error, changeset} ->
        Logger.error("Failed to update proof #{proof_id}: #{inspect(changeset)}")
        {:error, changeset}
    end
  end

  def update_proof_status_verified(proof_id) do
    Logger.info("Updating proof #{proof_id} status to verified")
    proof = get_proof!(proof_id)

    changeset = change_proof(proof, %{status: "verified"})

    case Repo.update(changeset) do
      {:ok, updated_proof} ->
        Logger.info("Updated proof #{proof_id} status to verified")
        {:ok, updated_proof}

      {:error, changeset} ->
        Logger.error("Failed to update proof #{proof_id}: #{inspect(changeset)}")
        {:error, changeset}
    end
  end

  def update_proof_status_claimed(address, proof_id, claim_tx_hash) do
    Logger.info("Updating proof #{proof_id} status to claimed")
    proof = get_proof!(proof_id)
    downcased_addr = String.downcase(address)

    if proof.wallet_address != downcased_addr do
      Logger.error("Failed to update proof #{proof_id} does not belong to address #{address}")
      {:error, %{}}
    else
      changeset = change_proof(proof, %{status: "claimed", claim_tx_hash: claim_tx_hash})

      case Repo.update(changeset) do
        {:ok, updated_proof} ->
          Logger.info("Updated proof #{proof_id} status to claimed")
          {:ok, updated_proof}

        {:error, changeset} ->
          Logger.error("Failed to update proof #{proof_id}: #{inspect(changeset)}")
          {:error, changeset}
      end
    end
  end

  def update_proof_status_failed(proof_id) do
    proof = get_proof!(proof_id)

    changeset = change_proof(proof, %{status: "failed"})

    case Repo.update(changeset) do
      {:ok, updated_proof} ->
        Logger.info("Updated proof #{proof_id} status to failed")
        {:ok, updated_proof}

      {:error, changeset} ->
        Logger.error("Failed to update proof #{proof_id}: #{inspect(changeset)}")
        {:error, changeset}
    end
  end

  def update_proof_retry(proof_id, max_fee) do
    proof = get_proof!(proof_id)

    changeset = change_proof(proof, %{
      status: "pending",
      inserted_at: DateTime.utc_now(),
      updated_at: DateTime.utc_now(),
      times_retried: proof.times_retried + 1,
      submitted_max_fee: max_fee
    })

    case Repo.update(changeset) do
      {:ok, updated_proof} ->
        Logger.info("Updated proof #{proof_id} status to pending for retry")
        {:ok, updated_proof}

      {:error, changeset} ->
        Logger.error("Failed to update proof #{proof_id}: #{inspect(changeset)}")
        {:error, changeset}
    end
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
