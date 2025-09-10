defmodule ZKArcadeIP do
  require Logger
  @api_base "https://ipapi.co"

  def log_country_from_conn(conn) do
    ip = ip_from_conn(conn)

    case get_country(ip) do
      {:ok, country} ->
        Logger.info("IP #{ip} is from #{country}")

      {:error, reason} ->
        Logger.warning("Could not resolve country for IP #{ip}: #{inspect(reason)}")
    end
  end

  def get_country(ip) when is_binary(ip) do
    url = "#{@api_base}/#{ip}/json/"

    case HTTPoison.get(url, [], recv_timeout: 5_000) do
      {:ok, %HTTPoison.Response{status_code: 200, body: body}} ->
        with {:ok, decoded} <- Jason.decode(body),
             %{"country_name" => country} <- decoded do
          {:ok, country}
        else
          _ -> {:error, :unexpected_response}
        end

      {:ok, %HTTPoison.Response{status_code: code, body: body}} ->
        {:error, {:http_error, code, body}}

      {:error, %HTTPoison.Error{reason: reason}} ->
        {:error, reason}
    end
  end


  defp ip_from_conn(conn) do
    forwarded =
      conn
      |> Plug.Conn.get_req_header("x-forwarded-for")
      |> List.first()

    cond do
      is_binary(forwarded) ->
        forwarded
        |> String.split(",", parts: 2)
        |> List.first()
        |> String.trim()

      true ->
        conn.remote_ip |> :inet.ntoa() |> to_string()
    end
  end
end
