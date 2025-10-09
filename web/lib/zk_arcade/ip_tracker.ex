defmodule ZkArcade.IpTracker do
  require Logger
  @api_base "https://api.ipinfo.io/lite/"
  @ipgeolocation_api_base "https://api.ipgeolocation.io/v2/ipgeo"


  def get_country_from_conn(conn) do
    ip = ip_from_conn(conn)

    get_country(ip)
  end

  def get_country(ip) when is_binary(ip) do
    case get_country_from_ipinfo(ip) do
      {:ok, country} -> {:ok, country}
      {:error, reason} ->
        Logger.warning("Primary IP service (ipinfo) failed for IP #{ip}: #{inspect(reason)}. Proceeding to check with fallback service.")

        case get_country_from_ipgeolocation(ip) do
          {:ok, country} -> {:ok, country}
          {:error, fallback_reason} ->
            Logger.error("Both IP services failed for IP #{ip}. Primary: #{inspect(reason)}, Fallback: #{inspect(fallback_reason)}")
            {:error, fallback_reason}
        end
    end
  end

  defp get_country_from_ipinfo(ip) do
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

  defp get_country_from_ipgeolocation(ip) do
    api_key = Application.get_env(:zk_arcade, :ipgeolocation_api_key)
    url = "#{@ipgeolocation_api_base}?apiKey=#{api_key}&ip=#{ip}&fields=location&output=json"

    case HTTPoison.get(url, [], recv_timeout: 5_000) do
      {:ok, %HTTPoison.Response{status_code: 200, body: body}} ->
        with {:ok, decoded} <- Jason.decode(body),
             %{"location" => location} <- decoded,
             %{"country_name" => country_name} <- location do
          {:ok, country_name}
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
