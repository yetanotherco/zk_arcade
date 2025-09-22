defmodule ZkArcade.IpTracker do
  require Logger
  @api_base "https://api.ipinfo.io/lite/"


  def get_country_from_conn(conn) do
    ip = ip_from_conn(conn)

    get_country(ip)
  end

  def get_country(ip) when is_binary(ip) do
    token = Application.get_env(:zk_arcade, :ip_info_api_key)
    url = "#{@api_base}/#{ip}?token=#{token}"

    case HTTPoison.get(url, [], recv_timeout: 5_000) do
      {:ok, %HTTPoison.Response{status_code: 200, body: body}} ->
        with {:ok, decoded} <- Jason.decode(body),
             %{"country" => country} <- decoded do
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
