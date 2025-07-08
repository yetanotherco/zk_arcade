defmodule ZkArcadeWeb.ProofController do
  require Logger
  use ZkArcadeWeb, :controller

  alias ZkArcade.SendProof
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
        "verification_data" => verification_data_json,
        "signature" => signature_json,
        "address" => address,
      }) do
    with {:ok, verification_data} <- Jason.decode(verification_data_json),
         {:ok, signature} <- Jason.decode(signature_json) do
      Logger.info("Received verification_data: #{inspect(verification_data)}")
      Logger.info("Received signature: #{inspect(signature)}")
      Logger.info("Received address: #{inspect(address)}")

      # Web socket communication
      case SendProof.call(verification_data, signature, address) do
        :ok ->
          # Insert the entry to the database
          proof_params = %{
            verification_data: verification_data,
            wallet_address: address
          }

          case Proofs.create_proof(proof_params) do
            {:ok, proof} ->
              Logger.info("Proof saved successfully with ID: #{proof.id}")
              conn
              |> put_flash(:info, "Proof submitted and saved successfully!")
              |> redirect(to: "/")

            {:error, changeset} ->
              Logger.error("Failed to save proof: #{inspect(changeset)}")
              conn
              |> put_flash(:error, "Proof submitted but failed to save to database")
              |> redirect(to: "/")
          end

        {:error, reason} ->
          Logger.error("SendProof failed: #{inspect(reason)}")
          conn
          |> put_flash(:error, "Failed to submit proof: #{inspect(reason)}")
          |> redirect(to: "/")
      end
    else
      error ->
        Logger.error("Error decoding JSON: #{inspect(error)}")

        conn
        |> put_flash(:error, "Invalid data received")
        |> redirect(to: "/")
    end
  end
end
