defmodule ZkArcadeWeb.ProofController do
  require Logger
  use ZkArcadeWeb, :controller

  alias ZkArcade.BatcherConnection
  alias ZkArcade.Proofs
  alias ZkArcade.EIP712Verifier

  def mark_proof_as_submitted_to_leaderboard(conn, %{"proof_id" => proof_id}) do
    address = get_session(conn, :wallet_address)

    if is_nil(address) do
      conn
      |> redirect(to: "/")
    end

    Proofs.update_proof_status_claimed(address, proof_id)

    conn
    |> redirect(to: "/")
  end

  def get_proof_verification_data(conn, %{"proof_id" => proof_id}) do
    address = get_session(conn, :wallet_address)

    if is_nil(address) do
      conn
      |> redirect(to: "/")
    else
      case Proofs.get_proof_verification_data(proof_id) do
        nil ->
          send_resp(conn, 404, Jason.encode!(%{error: "Proof not found"}))

        proof_data ->
          json(conn, proof_data)
      end
    end
  end

  def parse_public_input(public_input) when is_list(public_input) and length(public_input) >= 96 do
    <<level_bytes::binary-size(32), game_bytes::binary-size(32), address_bytes::binary-size(32)>> =
      :binary.list_to_bin(public_input)

    level =
      case level_bytes do
        <<_::binary-size(30), high, low>> -> high * 256 + low
        _ -> raise "Invalid level format"
      end

    %{
      level: level,
      game: Base.encode16(game_bytes, case: :lower),
      address: "0x" <> Base.encode16(binary_part(address_bytes, 12, 20), case: :lower)
    }
  end

  def submit(conn, %{
        "submit_proof_message" => submit_proof_message_json,
        "game" => game
      }) do
    with {:ok, submit_proof_message} <- Jason.decode(submit_proof_message_json) do
      address = get_session(conn, :wallet_address)

      if is_nil(address) do
        Logger.error("Address is not defined in session!")

        conn
        |> put_flash(:error, "Wallet address is undefined.")
        |> redirect(to: "/")
        |> halt()
      else
        with {:ok, true} <-
              EIP712Verifier.verify_aligned_signature(
                submit_proof_message,
                address,
                submit_proof_message["verificationData"]["chain_id"]
              ) do
          Logger.info("Message decoded and signature verified. Sending async task.")

          proving_system =
              submit_proof_message["verificationData"]["verificationData"]["provingSystem"]

          %{level: level, game: gameConfig, address: _address} =
            submit_proof_message["verificationData"]["verificationData"]["publicInput"]
            |> parse_public_input()

          with {:ok, pending_proof} <-
                Proofs.create_pending_proof(submit_proof_message, address, game, proving_system, gameConfig, level) do
            task =
              Task.Supervisor.async_nolink(ZkArcade.TaskSupervisor, fn ->
                Registry.register(ZkArcade.ProofRegistry, pending_proof.id, nil)

                Logger.info(
                  "Proof created successfully with ID: #{pending_proof.id} with pending state"
                )

                submit_to_batcher(submit_proof_message, address, pending_proof.id)
              end)

            case Task.yield(task, 10_000) do
              {:ok, {:ok, result}} ->
                Logger.info("Task completed successfully: #{inspect(result)}")

                conn
                |> put_flash(:info, "Proof submitted successfully!")
                |> redirect(to: build_redirect_url(conn, "proof-sent"))

              {:ok, {:error, reason}} ->
                Logger.error("Failed to send proof to batcher: #{inspect(reason)}")

                conn
                |> put_flash(:error, "Failed to submit proof: #{inspect(reason)}")
                |> redirect(to: build_redirect_url(conn, "proof-failed"))

              nil ->
                Logger.info("Task is taking longer than 10 seconds, proceeding.")

                conn
                |> put_flash(:info, "Proof is being submitted to batcher.")
                |> redirect(to: build_redirect_url(conn, "proof-sent"))
            end
          else
            {:error, changeset} when is_map(changeset) ->
              Logger.error("Failed to create proof: #{inspect(changeset)}")
              {:error, changeset}
          end
        else
          {:error, reason} ->
            Logger.error("Failed to verify the received signature: #{inspect(reason)}")

            conn
            |> put_flash(:error, "Failed to verify the received signature: #{inspect(reason)}")
            |> redirect(to: build_redirect_url(conn, "proof-failed"))
        end
      end
    else
      error ->
        Logger.error("Input validation failed: #{inspect(error)}")

        conn
        |> put_flash(:error, "Invalid input: #{inspect(error)}")
        |> redirect(to: build_redirect_url(conn, "proof-failed"))
        |> halt()
    end
  end

  defp build_redirect_url(conn, message) do
    referer = get_req_header(conn, "referer") |> List.first() || "/"
    uri = URI.parse(referer)

    query_params =
      case uri.query do
        nil -> %{}
        q -> URI.decode_query(q)
      end

    new_query =
      query_params
      |> Map.put("message", message)
      |> URI.encode_query()

    uri.path <> "?" <> new_query
  end

  defp submit_to_batcher(submit_proof_message, address, pending_proof_id) do
    case BatcherConnection.send_submit_proof_message(submit_proof_message, address) do
      {:ok, {:batch_inclusion, batch_data}} ->
        case Proofs.update_proof_status_submitted(pending_proof_id, batch_data) do
          {:ok, updated_proof} ->
            Logger.info("Proof #{pending_proof_id} verified and updated successfully")

            case wait_aligned_verification(submit_proof_message, batch_data) do
              {:ok, _result} ->
                Logger.info("Verification succeeded")
                case Proofs.update_proof_status_verified(updated_proof.id) do
                  {:ok, _} ->
                    Logger.info("Proof #{updated_proof.id} status updated to verified")
                  {:error, reason} ->
                    Logger.error("Failed to update proof #{updated_proof.id} status: #{inspect(reason)}")
                end
              {:error, reason} ->
                Logger.error("Error: #{inspect(reason)}")
                case Proofs.update_proof_status_failed(updated_proof.id) do
                  {:ok, _} ->
                    Logger.info("Proof #{updated_proof.id} status updated to failed")
                  {:error, reason} ->
                    Logger.error("Failed to update proof #{updated_proof.id} status: #{inspect(reason)}")
                end
              nil ->
                Logger.error("Error without reason")
            end

            {:ok, updated_proof}

          {:error, reason} ->
            Logger.error("Failed to update proof status: #{inspect(reason)}")
            {:error, reason}
        end

      {:error, reason} ->
        Logger.error("Failed to send proof to the batcher: #{inspect(reason)}")

        case Proofs.update_proof_status_failed(pending_proof_id) do
          {:ok, _} ->
            Logger.info("Proof #{pending_proof_id} status updated to failed")
            {:error, reason}

          {:error, changeset} ->
            Logger.error(
              "Failed to update proof #{pending_proof_id} status: #{inspect(changeset)}"
            )

            {:error, reason}
        end
    end
  end

  @zero32 :binary.copy(<<0>>, 32)

  @type verification_data :: %{
          required(:proof) => binary(),
          optional(:publicInput) => binary() | nil,
          optional(:verificationKey) => binary() | nil,
          optional(:vmProgramCode) => binary() | nil,
          required(:provingSystem) => atom() | String.t(),
          required(:proofGeneratorAddress) => String.t() # "0x..."
        }

  @spec compute_verification_data_commitment(
          verification_data(),
          %{optional(atom() | String.t()) => 0..255}
        ) :: %{
          commitmentDigest: binary(),
          proofCommitment: binary(),
          pubInputCommitment: binary(),
          provingSystemAuxDataCommitment: binary()
        }
  def compute_verification_data_commitment(verification_data, proving_system_name_to_byte) do
    proof_commitment = keccak256(get_k(verification_data, :proof))

    pub_input_commitment =
      case get_k(verification_data, :publicInput) do
        nil -> @zero32
        bytes -> keccak256(bytes)
      end

    proving_system_name = get_k(verification_data, :provingSystem)
    ps_byte_int = Map.fetch!(proving_system_name_to_byte, proving_system_name)
    proving_system_byte = <<ps_byte_int>>

    proving_system_aux_commitment =
      cond do
        vk = get_k(verification_data, :verificationKey) ->
          keccak256(bin(vk) <> proving_system_byte)

        code = get_k(verification_data, :vmProgramCode) ->
          keccak256(bin(code) <> proving_system_byte)

        true ->
          @zero32
      end

    proof_generator_address =
      get_k(verification_data, :proofGeneratorAddress)
      |> hex_to_bytes()

    commitment_digest =
      keccak256(proof_commitment <>
                  pub_input_commitment <>
                  proving_system_aux_commitment <>
                  proof_generator_address)

    %{
      commitmentDigest: commitment_digest,
      proofCommitment: proof_commitment,
      pubInputCommitment: pub_input_commitment,
      provingSystemAuxDataCommitment: proving_system_aux_commitment
    }
  end

  defp get_k(map, key), do: Map.get(map, key) || Map.get(map, to_string(key))

  defp bin(v) when is_binary(v), do: v
  defp bin(v) when is_list(v),   do: :erlang.iolist_to_binary(v)
  defp bin(nil), do: nil

  defp keccak256(data), do: ExKeccak.hash_256(bin(data))

  @spec hex_to_bytes(String.t()) :: binary()
  defp hex_to_bytes("0x" <> rest), do: hex_to_bytes(rest)

  defp hex_to_bytes(hex) when is_binary(hex) do
    hex
    |> even_length_hex()
    |> String.upcase()
    |> Base.decode16!(case: :mixed)
  end

  defp even_length_hex(h) do
    if rem(byte_size(h), 2) == 1, do: "0" <> h, else: h
  end

  def wait_aligned_verification(submit_proof_message, batch_inclusion_data) do
    Logger.info("Waiting for aligned verification...")

    payment_service_addr = Application.get_env(:zk_arcade, :payment_service_address)

    verification_data = submit_proof_message["verificationData"]["verificationData"]

    proving_system_name_to_byte = %{
      "GnarkPlonkBls12_381" => 0,
      "GnarkPlonkBn254" => 1,
      "GnarkGroth16Bn254" => 2,
      "SP1" => 3,
      "Risc0" => 4,
      "CircomGroth16Bn256" => 5
    }

    commitment =
      compute_verification_data_commitment(verification_data, proving_system_name_to_byte)

    batch_merkle_root_bin = bin(batch_inclusion_data["batch_merkle_root"])

    merkle_path_chunks =
      get_in(batch_inclusion_data, ["batch_inclusion_proof", "merkle_path"]) || []

    encoded_merkle_proof =
      merkle_path_chunks
      |> Enum.map(&bin/1)
      |> Enum.map(fn chunk ->
        if byte_size(chunk) != 32 do
          Logger.warning("Merkle proof chunk has size #{byte_size(chunk)}, expected 32")
        end
        chunk
      end)
      |> :erlang.iolist_to_binary()

    index_in_batch = batch_inclusion_data["index_in_batch"]

    proof_generator_addr20 =
      verification_data["proofGeneratorAddress"]
      |> hex_to_bytes()

    :timer.sleep(:timer.seconds(10))

    verify_fn = fn ->
      ZkArcade.ServiceManagerContract.verify_proof_inclusion(
        commitment.proofCommitment,
        commitment.pubInputCommitment,
        commitment.provingSystemAuxDataCommitment,
        proof_generator_addr20,
        batch_merkle_root_bin,
        encoded_merkle_proof,
        index_in_batch,
        payment_service_addr
      )
    end

    result = retry_with_backoff(verify_fn, [30, 60, 120, 240])

    case result do
      true ->
        Logger.info("Verification succeeded")
        {:ok, "ok"}

      false ->
        Logger.error("Verification failed after retries")
        {:error, "Verification failed after retries"}

      {:error, reason} ->
        Logger.error("Verification failed after retries: #{inspect(reason)}")
        {:error, reason}
    end
  end

  defp retry_with_backoff(fun, []), do: false
  defp retry_with_backoff(fun, [delay | rest]) do
    :timer.sleep(:timer.seconds(delay))
    case fun.() do
      true ->
        true
      false ->
        Logger.info("Verification failed, retrying in #{delay} seconds...")
        retry_with_backoff(fun, rest)
    end
  end

  def retry_submit_proof(conn, %{
        "proof_id" => proof_id,
        "submit_proof_message" => submit_proof_message_json
      }) do
    with {:ok, submit_proof_message} <- Jason.decode(submit_proof_message_json) do
      Logger.info("Retrying proof submission for proof ID: #{proof_id}")
      address = get_session(conn, :wallet_address)

      if is_nil(address) do
        Logger.error("Address is not defined in session!")

        conn
        |> put_flash(:error, "Wallet address is undefined.")
        |> redirect(to: build_redirect_url(conn, ""))
        |> halt()
      else
        case Proofs.get_proof_by_id(proof_id) do
          nil ->
            Logger.error("Proof with ID #{proof_id} not found for wallet #{address}")

            conn
            |> put_flash(:error, "Proof not found.")
            |> redirect(to: build_redirect_url(conn, "proof-failed"))
            |> halt()

          proof ->
            case EIP712Verifier.verify_aligned_signature(
                  submit_proof_message,
                  address,
                  submit_proof_message["verificationData"]["chain_id"]
                ) do
              {:ok, true} ->
                Logger.info("Message decoded and signature verified. Retrying proof submission.")

                case Registry.lookup(ZkArcade.ProofRegistry, proof.id) do
                  [{pid, _value}] when is_pid(pid) ->
                    Logger.info("Killing task for proof #{proof.id}")
                    Process.exit(pid, :kill)

                  [] ->
                    Logger.error("No running task found for proof #{proof.id}")
                end

                case Proofs.update_proof_retry(proof.id) do
                  {:ok, _} ->
                    Logger.info("Proof #{proof.id} updated before retrying")

                  {:error, changeset} ->
                    Logger.error("Failed to update proof #{proof.id} status: #{inspect(changeset)}")
                end

                task =
                  Task.Supervisor.async_nolink(ZkArcade.TaskSupervisor, fn ->
                    Registry.register(ZkArcade.ProofRegistry, proof.id, nil)

                    Logger.info("Retrying proof submission for ID: #{proof.id}")

                    submit_to_batcher(submit_proof_message, address, proof.id)
                  end)

                case Task.yield(task, 10_000) do
                  {:ok, {:ok, result}} ->
                    Logger.info("Task completed successfully: #{inspect(result)}")

                    conn
                    |> put_flash(:info, "Proof retried successfully!")
                    |> redirect(to: build_redirect_url(conn, "proof-sent"))

                  {:ok, {:error, reason}} ->
                    Logger.error("Failed to retry proof submission: #{inspect(reason)}")

                    conn
                    |> put_flash(:error, "Failed to retry proof submission: #{inspect(reason)}")
                    |> redirect(to: build_redirect_url(conn, "proof-failed"))

                  nil ->
                    Logger.info("Task is taking longer than 10 seconds, proceeding.")

                    conn
                    |> put_flash(:info, "Proof is being submitted to batcher.")
                    |> redirect(to: build_redirect_url(conn, "proof-sent"))
                end

              {:ok, false} ->
                Logger.error("Signature verification failed for proof #{proof_id}")

                conn
                |> put_flash(:error, "Signature verification failed.")
                |> redirect(to: build_redirect_url(conn, "proof-failed"))

              {:error, reason} ->
                Logger.error("Signature verification error for proof #{proof_id}: #{inspect(reason)}")

                conn
                |> put_flash(:error, "Signature verification error: #{inspect(reason)}")
                |> redirect(to: build_redirect_url(conn, "proof-failed"))
            end
        end
      end
    else
      error ->
        Logger.error("Input validation failed: #{inspect(error)}")

        conn
        |> put_flash(:error, "Invalid input: #{inspect(error)}")
        |> redirect(to: build_redirect_url(conn, "proof-failed"))
        |> halt()
    end
  end
end
