defmodule ZkArcadeWeb.TelemetryApiController do
  use ZkArcadeWeb, :controller

  alias ZkArcade.TelemetryLogs

  def log_error(conn, %{
        "name" => name,
        "message" => message,
        "details" => details
      }) do
    address = get_session(conn, :wallet_address)

    case TelemetryLogs.create_log(%{name: name, message: message, details: details, address: address}) do
      {:ok, _log} -> json(conn, %{status: "ok"})
      {:error, _changeset} ->
        conn
        |> put_status(:server_error)
        |> json(%{error: "could not persist log"})
    end
  end

  def log_error(conn, _params) do
    conn
    |> put_status(:bad_request)
    |> json(%{error: "invalid payload"})
  end
end
