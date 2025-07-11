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
        "address" => address,
      }) do
    with {:ok, submit_proof_message} <- Jason.decode(submit_proof_message_json) do
        Logger.info("Message decoding succesful, sending message on an async task.")
        Task.Supervisor.async_nolink(ZkArcade.TaskSupervisor, fn ->
          submit_to_batcher(submit_proof_message, address)
        end)

        conn
        |> put_flash(:info, "Proof is being submitted to batcher on an async task.")
        |> redirect(to: "/")
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

            {:error, changeset} ->
              Logger.error("Failed to save proof: #{inspect(changeset)}")
          end

        {:error, reason} ->
          Logger.error("Failed to send proof to the batcher: #{inspect(reason)}")
      end
  end
end
