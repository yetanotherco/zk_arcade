defmodule ZkArcadeWeb.ProofController do
  require Logger
  use ZkArcadeWeb, :controller

  alias ZkArcade.BatcherConnection
  alias ZkArcade.Proofs

  def home(conn, _params) do
    wallet =
      if address = get_session(conn, :wallet_address) do
        case ZkArcade.Accounts.fetch_wallet_by_address(address) do
          {:ok, wallet} -> wallet
          _ -> nil
        end
      else
        nil
      end

    conn
    |> assign(:wallet, wallet)
    |> render(:home, layout: false)
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

      # Note: The proof creation is done here because we need the proof id to modify the proof state later,
      # which is passed to the task below
      {:ok, pending_proof} = case Proofs.create_pending_proof(submit_proof_message, address) do
        {:ok, pending_proof} ->
          Logger.info("Proof created successfully with ID: #{pending_proof.id} with pending state")
        {:error, changeset} ->
          Logger.error("Failed to create proof: #{inspect(changeset)}")
          conn
          |> put_flash(:error, "Failed to create proof")
          |> redirect(to: "/")
          |> halt()
      end

      Logger.info("Message decoding successful, sending message on an async task.")
      task = Task.Supervisor.async_nolink(ZkArcade.TaskSupervisor, fn ->
        submit_to_batcher(submit_proof_message, address, pending_proof.id)
      end)

      # Wait a few seconds to catch immediate errors
      case Task.yield(task, 10000) do
        {:ok, {:ok, result}} ->
          Logger.info("Task completed successfully: #{inspect(result)}")
          conn
          |> put_flash(:info, "Proof submitted successfully!")
          |> redirect(to: "/")

        {:ok, {:error, reason}} ->
          Logger.error("Failed to send proof to batcher on async task: #{inspect(reason)}")
          Proofs.update_proof_status(pending_proof.id, "failed", nil)
          conn
          |> put_flash(:error, "Failed to submit proof: #{inspect(reason)}")
          |> redirect(to: "/")

        nil ->
          Logger.info("Task is taking longer than 5 seconds, continuing without waiting.")
          conn
          |> put_flash(:info, "Proof is being submitted to batcher.")
          |> redirect(to: "/")
      end
    else
      error ->
      Logger.error("Input validation failed: #{inspect(error)}")
      conn
      |> put_flash(:error, "Invalid input: #{inspect(error)}")
      |> redirect(to: "/")
    end
  end

  defp submit_to_batcher(submit_proof_message, address, proof_id) do
    case BatcherConnection.send_submit_proof_message(submit_proof_message, address) do
      {:ok, {:batch_inclusion, batch_data}} ->
        Proofs.update_proof_status(proof_id, "verified", batch_data)

      {:error, reason} ->
        Logger.error("Failed to send proof to the batcher: #{inspect(reason)}")
        Proofs.update_proof_status(proof_id, "failed", nil)
        {:error, reason}
    end
  end
end
