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
            String.downcase(
              submit_proof_message["verificationData"]["verificationData"]["provingSystem"]
            )

          with {:ok, pending_proof} <-
                 Proofs.create_pending_proof(submit_proof_message, address, game, proving_system) do
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
                |> redirect(to: "/game/beast?message=proof-sent")

              {:ok, {:error, reason}} ->
                Logger.error("Failed to send proof to batcher: #{inspect(reason)}")

                conn
                |> put_flash(:error, "Failed to submit proof: #{inspect(reason)}")
                |> redirect(to: "/game/beast?message=proof-failed")

              nil ->
                Logger.info("Task is taking longer than 10 seconds, proceeding.")

                conn
                |> put_flash(:info, "Proof is being submitted to batcher.")
                |> redirect(to: "/game/beast?message=proof-sent")
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
            |> redirect(to: "/game/beast?message=proof-failed")
        end
      end
    else
      error ->
        Logger.error("Input validation failed: #{inspect(error)}")

        conn
        |> put_flash(:error, "Invalid input: #{inspect(error)}")
        |> redirect(to: "/game/beast?message=proof-failed")
        |> halt()
    end
  end

  defp submit_to_batcher(submit_proof_message, address, pending_proof_id) do
    case BatcherConnection.send_submit_proof_message(submit_proof_message, address) do
      {:ok, {:batch_inclusion, batch_data}} ->
        case Proofs.update_proof_status_submitted(pending_proof_id, batch_data) do
          {:ok, updated_proof} ->
            Logger.info("Proof #{pending_proof_id} verified and updated successfully")
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
        |> redirect(to: "/")
        |> halt()
      else
        case Proofs.get_proof_by_id(proof_id) do
          nil ->
            Logger.error("Proof with ID #{proof_id} not found for wallet #{address}")

            conn
            |> put_flash(:error, "Proof not found.")
            |> redirect(to: "/")
            |> halt()

          proof ->
            Logger.info(
              "Found proof with ID #{proof_id}, verification data: #{inspect(proof.verification_data)}"
            )

            with {:ok, true} <-
                   EIP712Verifier.verify_aligned_signature(
                     submit_proof_message,
                     address,
                     submit_proof_message["verificationData"]["chain_id"]
                   ) do
              Logger.info("Message decoded and signature verified. Retrying proof submission.")

              case Registry.lookup(ZkArcade.ProofRegistry, proof.id) do
                [{pid, _value}] when is_pid(pid) ->
                  Logger.info("Killing task for proof #{proof.id}")

                  Process.exit(pid, :kill)

                [] ->
                  Logger.error("No running task found for proof #{proof.id}")
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
                  |> redirect(to: "/game/beast?message=proof-retried")

                {:ok, {:error, reason}} ->
                  Logger.error("Failed to retry proof submission: #{inspect(reason)}")

                  conn
                  |> put_flash(:error, "Failed to retry proof submission: #{inspect(reason)}")
                  |> redirect(to: "/game/beast?message=proof-failed")

                nil ->
                  Logger.info("Task is taking longer than 10 seconds, proceeding.")

                  conn
                  |> put_flash(:info, "Proof is being submitted to batcher.")
                  |> redirect(to: "/game/beast?message=proof-sent")
              end
            end
        end
      end
    else
      error ->
        Logger.error("Input validation failed: #{inspect(error)}")

        conn
        |> put_flash(:error, "Invalid input: #{inspect(error)}")
        |> redirect(to: "/game/beast?message=proof-failed")
        |> halt()
    end
  end
end
