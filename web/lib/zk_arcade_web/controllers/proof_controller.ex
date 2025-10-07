defmodule ZkArcadeWeb.ProofController do
  require Logger
  use ZkArcadeWeb, :controller

  alias ZkArcade.BatcherConnection
  alias ZkArcade.Proofs
  alias ZkArcade.EIP712Verifier
  alias ZkArcade.PrometheusMetrics

  def get_pending_proofs_to_bump(conn, %{"address" => address}) do
    case ZkArcade.Proofs.get_pending_proofs_to_bump(address) do
      nil ->
        conn
        |> put_status(:internal_server_error)
        |> json(%{error: "Failed to fetch pending proofs"})
      proofs ->
        conn |> json(proofs)
    end
  end

  @task_timeout 10_000

  defp bind({:ok, v}, fun), do: fun.(v)
  defp bind(err, _fun), do: err

  defp send_not_found_response(conn, message) do
    send_resp(conn, 404, Jason.encode!(%{error: message}))
  end

  def mark_proof_as_submitted_to_leaderboard(conn, %{
        "proof_id" => proof_id,
        "claim_tx_hash" => claim_tx_hash
      }) do
    if address = get_session(conn, :wallet_address) do
      Proofs.update_proof_status_claimed(address, proof_id, claim_tx_hash)
      redirect(conn, to: build_redirect_url(conn, "", proof_id))
    else
      conn
      |> redirect(to: "/")
    end
  end

  def get_proof_status(conn, %{"proof_id" => proof_id}) do
    case Proofs.get_status(proof_id) do
      nil -> send_not_found_response(conn, "Proof not found")
      proof_status -> json(conn, %{status: proof_status.status})
    end
  end

  def get_proof_submission(conn, %{"proof_id" => proof_id}) do
    case Proofs.get_proof_submission(proof_id) do
      nil -> send_not_found_response(conn, "Proof not found")
      proof -> json(conn, proof)
    end
  end

  def get_proof_verification_data(conn, %{"proof_id" => proof_id}) do
    if get_session(conn, :wallet_address) do
      case Proofs.get_proof_verification_data(proof_id) do
        nil ->
          send_not_found_response(conn, "Proof not found")
        proof_data ->
          json(conn, proof_data)
      end
    else
      conn
      |> redirect(to: "/")
    end
  end

  def parse_public_input_risc0_sp1(public_input)
      when is_list(public_input) and length(public_input) >= 96 do
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

  def parse_public_input_circom(public_input) when is_list(public_input) do
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

  defp verify_signature(submit_proof_message, address) do
    chain_id = submit_proof_message["verificationData"]["chain_id"]

    case EIP712Verifier.verify_aligned_signature(submit_proof_message, address, chain_id) do
      {:ok, true} -> {:ok, true}
      {:ok, false} -> {:error, "Signature verification failed"}
      {:error, reason} -> {:error, "Signature verification error: #{inspect(reason)}"}
    end
  end

  defp parse_proof_data(submit_proof_message) do
    verification_data = submit_proof_message["verificationData"]["verificationData"]
    proving_system = verification_data["provingSystem"]
    public_input = verification_data["publicInput"]
    max_fee = submit_proof_message["verificationData"]["maxFee"]

    parsed_input =
      case proving_system do
        system when system in ["Risc0", "SP1"] ->
          parse_public_input_risc0_sp1(public_input)
        "CircomGroth16Bn256" ->
          parse_public_input_circom(public_input)
        _ ->
          raise "Unsupported proving system: #{proving_system}"
      end

    {:ok, Map.merge(parsed_input, %{proving_system: proving_system, max_fee: max_fee})}
  rescue
    error -> {:error, "Failed to parse proof data: #{inspect(error)}"}
  end

  defp create_pending_proof_if_valid(submit_proof_message, address, game, game_idx, parsed_data) do
    %{level: level, game: game_config, proving_system: proving_system, max_fee: max_fee} = parsed_data

    # Check if exists a proof with a higher or equal level for the same game config
    existing_proof = Proofs.get_highest_level_proof(address, game_idx, game)

    Logger.info(
      "Existing proof for address #{address}, game_idx #{game_idx} and game #{game}, with level reached #{ if existing_proof do existing_proof.level_reached else "none" end}"
    )

    if existing_proof && existing_proof.level_reached >= level do
      {:error, :level_already_reached}
    else
      case Proofs.create_pending_proof(
             submit_proof_message,
             address,
             game,
             proving_system,
             game_config,
             level,
             max_fee,
             game_idx
           ) do
        {:ok, pending_proof} ->
          {:ok, pending_proof}
        {:error, changeset} ->
          PrometheusMetrics.record_proof_error(:create_pending_proof_failed)
          Logger.error("Failed to create proof: #{inspect(changeset)}")
          {:error, changeset}
      end
    end
  end

  defp get_proof_for_retry(proof_id, address) do
    case Proofs.get_proof_by_id(proof_id) do
      nil ->
        PrometheusMetrics.record_proof_error(:proof_not_found)
        Logger.error("Proof with ID #{proof_id} not found for wallet #{address}")
        {:error, :proof_not_found}
      proof ->
        {:ok, proof}
    end
  end

  defp create_retry_task(submit_proof_message, address, proof_id, proof_retry_pid) do
    Task.Supervisor.async_nolink(ZkArcade.TaskSupervisor, fn ->
      Registry.register(ZkArcade.ProofRegistry, proof_retry_pid, nil)
      Logger.info("Retrying proof submission for ID: #{proof_retry_pid}")
      retry_submit_to_batcher(submit_proof_message, address, proof_id)
    end)
  end

  defp handle_submission_error(conn, reason) do
    PrometheusMetrics.record_proof_error(:submission_failed)
    Logger.error("Submission failed: #{inspect(reason)}")

    conn
    |> redirect(to: build_redirect_url(conn, "proof-failed"))
  end

  defp handle_proof_not_found_error(conn) do
    conn
    |> redirect(to: build_redirect_url(conn, "proof-failed"))
  end

  defp handle_retry_error(conn, reason) do
    PrometheusMetrics.record_proof_error(:retry_failed)
    Logger.error("Retry failed: #{inspect(reason)}")

    conn
    |> redirect(to: build_redirect_url(conn, "proof-failed"))
  end

  def submit(conn, %{
        "submit_proof_message" => submit_proof_message_json,
        "game" => game,
        "game_idx" => game_idx
      }) do
    if address = get_session(conn, :wallet_address) do
      result =
        submit_proof_message_json
        |> Jason.decode()
        |> bind(fn msg ->
          case verify_signature(msg, address) do
            {:ok, true} -> {:ok, {msg, address}}
            {:error, reason} -> {:error, reason}
          end
        end)
        |> bind(fn {msg, address} ->
          case parse_proof_data(msg) do
            {:ok, parsed} -> {:ok, {msg, address, parsed}}
            {:error, reason} -> {:error, reason}
          end
        end)
        |> bind(fn {msg, address, parsed} ->
          create_pending_proof_if_valid(msg, address, game, game_idx, parsed)
          |> case do
            {:ok, pending_proof} -> {:ok, {msg, address, pending_proof}}
            err -> err
          end
        end)

      case result do
        {:ok, {msg, address, pending_proof}} ->
          task =
            Task.Supervisor.async_nolink(ZkArcade.TaskSupervisor, fn ->
              Registry.register(ZkArcade.ProofRegistry, pending_proof.id, nil)

              Logger.info(
                "Proof created successfully with ID: #{pending_proof.id} with pending state"
              )

              submit_to_batcher(msg, address, pending_proof.id)
            end)

          case Task.yield(task, @task_timeout) do
            {:ok, {:ok, result}} ->
              Logger.info("Task completed successfully: #{inspect(result)}")

              save_user_country(conn, address)

              conn
              |> redirect(to: build_redirect_url(conn, "proof-sent", pending_proof.id))

            {:ok, {:error, reason}} ->
              PrometheusMetrics.record_proof_error(:submit_to_batcher_failed)
              Logger.error("Failed to send proof to batcher: #{inspect(reason)}")
              # Remove the proof since it failed during batcher validation,
              # we don't want to count it as sent
              Proofs.delete_proof(pending_proof)

              conn
              |> redirect(to: build_redirect_url(conn, "proof-failed", pending_proof.id))

            nil ->
              Logger.info("Task is taking longer than #{@task_timeout} seconds, proceeding.")
              save_user_country(conn, address)

              conn
              |> redirect(to: build_redirect_url(conn, "proof-sent", pending_proof.id))
          end

        {:error, :level_already_reached} ->
          redirect(conn, to: build_redirect_url(conn, "level-reached"))

        {:error, reason} ->
          handle_submission_error(conn, reason)
      end
    else
      redirect(conn, to: "/")
    end
  end

  defp build_redirect_url(conn, message, proof_id \\ "") do
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
      |> Map.put("submitProofId", proof_id)
      |> URI.encode_query()

    uri.path <> "?" <> new_query
  end

  defp submit_to_batcher(submit_proof_message, address, pending_proof_id) do
    do_submit_to_batcher(submit_proof_message, address, pending_proof_id, :initial)
  end

  defp retry_submit_to_batcher(submit_proof_message, address, pending_proof_id) do
    do_submit_to_batcher(submit_proof_message, address, pending_proof_id, :retry)
  end

  defp do_submit_to_batcher(submit_proof_message, address, pending_proof_id, attempt_type) do
    case BatcherConnection.send_submit_proof_message(submit_proof_message, address) do
      {:ok, {:batch_inclusion, batch_data}} ->
        handle_batch_inclusion(submit_proof_message, pending_proof_id, batch_data, attempt_type)
      {:error, reason} ->
        handle_batcher_failure(pending_proof_id, reason, attempt_type)
    end
  end

  defp handle_batch_inclusion(submit_proof_message, pending_proof_id, batch_data, attempt_type) do
    case Proofs.update_proof_status_submitted(pending_proof_id, batch_data) do
      {:ok, updated_proof} ->
        Logger.info("Proof #{pending_proof_id} submitted and updated successfully")
        handle_aligned_verification(submit_proof_message, batch_data, updated_proof, attempt_type)
        {:ok, updated_proof}

      {:error, reason} ->
        Logger.error("Failed to update proof status: #{inspect(reason)}")
        {:error, reason}
    end
  end

  defp handle_aligned_verification(submit_proof_message, batch_data, updated_proof, attempt_type) do
    case ZkArcade.AlignedVerificationWatcher.wait_aligned_verification(
           submit_proof_message,
           batch_data
         ) do
      {:ok, _result} ->
        Logger.info("Verification succeeded")

        case Proofs.update_proof_status_verified(updated_proof.id) do
          {:ok, _} ->
            Logger.info("Proof #{updated_proof.id} status updated to verified")

          {:error, reason} ->
            Logger.error("Failed to update proof #{updated_proof.id} status: #{inspect(reason)}")
        end

      {:error, reason} ->
        handle_verification_failure(updated_proof.id, reason, attempt_type)

      nil ->
        PrometheusMetrics.record_proof_error(:aligned_verification_unknown_error)
        Logger.error("Error without reason")
    end
  end

  defp handle_verification_failure(_proof_id, reason, :retry) do
    PrometheusMetrics.record_proof_error(:aligned_verification_failed_retry)
    Logger.error("Bump fee transaction failed to verify proof with reason: #{inspect(reason)}")
  end

  defp handle_verification_failure(proof_id, reason, :initial) do
    PrometheusMetrics.record_proof_error(:aligned_verification_failed)
    Logger.error("Failed to verify proof in aligned: #{inspect(reason)}")

    case Proofs.update_proof_status_failed(proof_id) do
      {:ok, _} ->
        Logger.info("Proof #{proof_id} status updated to failed")

      {:error, reason} ->
        Logger.error("Failed to update proof #{proof_id} status: #{inspect(reason)}")
    end
  end

  defp handle_batcher_failure(_proof_id, reason, :retry) do
    Logger.info("Bump fee transaction failed with reason: #{inspect(reason)}")
    {:error, reason}
  end

  defp handle_batcher_failure(proof_id, reason, :initial) do
    case reason do
      :replaced_by_higher_fee ->
        Logger.warning("Message has been replaced for other with a higher fee")
        {:error, reason}
      _ ->
        PrometheusMetrics.record_proof_error(:batcher_rejection)
        Logger.error("Failed to send proof to the batcher: #{inspect(reason)}")
        case Proofs.update_proof_status_failed(proof_id) do
          {:ok, _} ->
            Logger.info("Proof #{proof_id} status updated to failed")
            {:error, reason}

          {:error, changeset} ->
            Logger.error("Failed to update proof #{proof_id} status: #{inspect(changeset)}")

            {:error, reason}
        end
    end
  end

  def retry_submit_proof(conn, %{
        "proof_id" => proof_id,
        "submit_proof_message" => submit_proof_message_json
      }) do
    if address = get_session(conn, :wallet_address) do
      result =
        submit_proof_message_json
        |> Jason.decode()
        |> bind(fn msg ->
          case get_proof_for_retry(proof_id, address) do
            {:ok, proof} -> {:ok, {msg, address, proof}}
            err -> err
          end
        end)
        |> bind(fn {msg, address, proof} ->
          case verify_signature(msg, address) do
            {:ok, true} -> {:ok, {msg, address, proof}}
            {:ok, false} -> {:error, "Signature verification failed"}
            {:error, reason} -> {:error, reason}
          end
        end)

      case result do
        {:ok, {submit_proof_message, address, proof}} ->
          Logger.info("Message decoded and signature verified. Retrying proof submission.")

          max_fee =
            submit_proof_message["verificationData"]["maxFee"]

            proof_retry_pid = "#{proof.id}-#{proof.times_retried}"

          task = create_retry_task(submit_proof_message, address, proof.id, proof_retry_pid)

          case Task.yield(task, @task_timeout) do
            {:ok, {:ok, result}} ->
              Logger.info("Task completed successfully: #{inspect(result)}")

              conn
              |> redirect(to: build_redirect_url(conn, "proof-sent", proof.id))

            {:ok, {:error, reason}} ->
              PrometheusMetrics.record_proof_error(:retry_submit_failed)
              Logger.error("Failed to retry proof submission: #{inspect(reason)}")

              case reason do
                {:unrecognized_message, "UnderpricedProof"} ->
                  conn
                  |> redirect(to: build_redirect_url(conn, "underpriced-proof", proof_id))

                {:unrecognized_message, "InvalidNonce"} ->
                  conn
                  |> redirect(to: build_redirect_url(conn, "invalid-nonce", proof_id))

                {:unrecognized_message, "InsufficientBalance"} ->
                  conn
                  |> redirect(to: build_redirect_url(conn, "insufficient-balance", proof_id))

                _ ->
                  conn
                  |> redirect(to: build_redirect_url(conn, "bump-failed", proof_id))
              end

            nil ->
              Logger.info(
                "Task is taking longer than #{@task_timeout} seconds, proceeding and removing the previous task."
              )

              case Proofs.update_proof_retry(proof_id, max_fee) do
                {:ok, _} ->
                  Logger.info("Proof #{proof_id} updated before retrying")

                {:error, changeset} ->
                  Logger.error("Failed to update proof #{proof_id} status: #{inspect(changeset)}")
              end

              conn
              |> redirect(to: build_redirect_url(conn, "proof-sent", proof_id))
          end

        {:error, :proof_not_found} ->
          handle_proof_not_found_error(conn)

        {:error, reason} ->
          handle_retry_error(conn, reason)
      end
    else
      conn
      |> redirect(to: "/")
    end
  end

  defp save_user_country(conn, address) do
    has_country = ZkArcade.Accounts.has_country(address)

    case has_country do
      {:ok, result} ->
        save_country(conn, address, result)
      {:error, reason} ->
        Logger.warning("Could not resolve country for address #{address}: #{inspect(reason)}")
    end
  end

  defp save_country(_conn, _address, true) do
  end

  defp save_country(conn, address, false) do
   case ZkArcade.IpTracker.get_country_from_conn(conn) do
    {:ok, country} ->
      Logger.info("Address #{address} is from #{country}")
      ZkArcade.Accounts.set_country(address, country)

    {:error, reason} ->
      Logger.warning("Could not resolve country for address #{address}: #{inspect(reason)}")
   end
  end

end
