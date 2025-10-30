defmodule ZkArcadeWeb.TelemetryApiController do
  use ZkArcadeWeb, :controller

  alias ZkArcade.TelemetryLogs
  alias ZkArcade.Accounts

  def log_error(conn, %{
        "name" => name,
        "message" => message,
        "details" => details
      }) do
    address = get_session(conn, :wallet_address)

    case Accounts.get_owned_token_ids(address) do
      {:ok, [_ | _]} ->
        case TelemetryLogs.create_log(%{name: name, message: message, details: details, address: address}) do
          {:ok, _log} -> json(conn, %{status: "ok"})
          {:error, _changeset} ->
            conn
            |> put_status(:server_error)
            |> json(%{error: "could not persist log"})
        end

      _ ->
        conn
        |> put_status(:forbidden)
        |> json(%{error: "address not eligible"})
    end
  end

  def log_error(conn, _params) do
    conn
    |> put_status(:bad_request)
    |> json(%{error: "invalid payload"})
  end
end
