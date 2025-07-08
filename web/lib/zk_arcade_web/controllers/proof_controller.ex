defmodule ZkArcadeWeb.ProofController do
  require Logger
  use ZkArcadeWeb, :controller

  alias ZkArcade.SendProof

  def home(conn, _params) do
    render(conn, :home, layout: false)
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
          conn

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
