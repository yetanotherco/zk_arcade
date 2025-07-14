defmodule ZkArcadeWeb.ProofController do
  require Logger
  use ZkArcadeWeb, :controller

  alias ZkArcade.BatcherConnection
  alias ZkArcade.Proofs

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

      Logger.info("Message decoding successful, sending message on an async task.")
      task = Task.Supervisor.async_nolink(ZkArcade.TaskSupervisor, fn ->
        submit_to_batcher(submit_proof_message, address)
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

  defp submit_to_batcher(submit_proof_message, address) do
      case BatcherConnection.send_submit_proof_message(submit_proof_message, address) do
        {:ok, {:batch_inclusion, batch_data}} ->
          proof_params = %{
            batch_data: batch_data,
            wallet_address: address,
            verification_data: submit_proof_message["verificationData"]
          }

          case Proofs.create_proof(proof_params) do
            {:ok, proof} ->
              Logger.info("Proof saved successfully with ID: #{proof.id}")
              {:ok, proof}

            {:error, changeset} ->
              Logger.error("Failed to save proof: #{inspect(changeset)}")
              {:error, changeset}
          end

        {:error, reason} ->
          Logger.error("Failed to send proof to the batcher: #{inspect(reason)}")
          {:error, reason}
      end
  end
end
