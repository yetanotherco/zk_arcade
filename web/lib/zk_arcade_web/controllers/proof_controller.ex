defmodule ZkArcadeWeb.ProofController do
  require Logger
  use ZkArcadeWeb, :controller

  alias ZkArcade.BatcherConnection
  alias ZkArcade.Proofs

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
      }) do
    with {:ok, submit_proof_message} <- Jason.decode(submit_proof_message_json) do
      address = get_session(conn, :wallet_address)
      if is_nil(address) do
        conn
        |> put_flash(:error, "Wallet address is undefined.")
        |> redirect(to: "/")
      end

      # TO-DO: Verify the address obtained from the signature is the same as the one received from the session.

      Logger.info("Message decoding successful, sending message on an async task.")
      task = Task.Supervisor.async_nolink(ZkArcade.TaskSupervisor, fn ->
        submit_to_batcher(submit_proof_message, address)
      end)

      # Wait a few seconds to catch immediate errors
      case Task.yield(task, 10000) do
        {:ok, {:ok, result}} ->
          Logger.info("Task completed successfully: #{inspect(result)}")
          conn
          |> redirect(to: "/game/beast?message=proof-sent")

        {:ok, {:error, reason}} ->
          Logger.error("Failed to send proof to batcher on async task: #{inspect(reason)}")
          conn
          |> redirect(to: "/game/beast?message=proof-failed")

        nil ->
          Logger.info("Task is taking longer than 10 seconds, continuing without waiting.")
          conn
          |> redirect(to: "/game/beast?message=proof-sent")
      end
    else
      error ->
      Logger.error("Input validation failed: #{inspect(error)}")
      conn
      |> redirect(to: "/game/beast?message=proof-failed")
    end
  end

  defp submit_to_batcher(submit_proof_message, address) do
    with {:ok, pending_proof} <- Proofs.create_pending_proof(submit_proof_message, address) do
      Logger.info("Proof created successfully with ID: #{pending_proof.id} with pending state")
      case BatcherConnection.send_submit_proof_message(submit_proof_message, address) do
        {:ok, {:batch_inclusion, batch_data}} ->
          case Proofs.update_proof_status_submitted(pending_proof.id, batch_data) do
            {:ok, updated_proof} ->
              Logger.info("Proof #{pending_proof.id} verified and updated successfully")
              {:ok, updated_proof}
            {:error, reason} ->
              Logger.error("Failed to update proof status: #{inspect(reason)}")
              {:error, reason}
          end

        {:error, reason} ->
          Logger.error("Failed to send proof to the batcher: #{inspect(reason)}")
          proof_to_delete = Proofs.get_proof!(pending_proof.id)
          case Proofs.delete_proof(proof_to_delete) do
            {:ok, _deleted_proof} ->
              Logger.info("Proof #{pending_proof.id} deleted successfully")
            {:error, changeset} ->
              Logger.error("Failed to delete proof #{pending_proof.id} from database: #{inspect(changeset)}")
          end
          {:error, reason}
      end
    else
      {:error, changeset} when is_map(changeset) ->
        Logger.error("Failed to create proof: #{inspect(changeset)}")
        {:error, changeset}
    end
  end
end
