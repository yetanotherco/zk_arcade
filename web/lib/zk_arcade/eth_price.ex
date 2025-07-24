defmodule ZkArcade.EthPrice do
  use HTTPoison.Base

  @base_url "https://api.coingecko.com/api/v3"
  @cache_ttl :timer.minutes(5)

  def get_eth_price_usd do
    Cachex.get(:eth_price_cache, :eth_price)
    |> case do
      {:ok, nil} ->
        fetch_and_cache_eth_price()

      {:ok, price} ->
        {:ok, price}

      {:error, reason} ->
        {:error, reason}
    end
  end

  defp fetch_and_cache_eth_price do
    case get("/simple/price?ids=ethereum&vs_currencies=usd") do
      {:ok, %HTTPoison.Response{status_code: 200, body: body}} ->
        with {:ok, price} <- parse_response(body) do
          Cachex.put(:eth_price_cache, :eth_price, price, ttl: @cache_ttl)
          {:ok, price}
        end

      {:ok, %HTTPoison.Response{status_code: status_code}} ->
        {:error, "Request failed with status code: #{status_code}"}

      {:error, %HTTPoison.Error{reason: reason}} ->
        {:error, "HTTP request failed: #{reason}"}
    end
  end

  def parse_response(body) do
    case Jason.decode(body) do
      {:ok, %{"ethereum" => %{"usd" => price}}} ->
        {:ok, price}

      _ ->
        {:error, "Failed to parse response"}
    end
  end

  def process_url(url) do
    @base_url <> url
  end

  def process_response_body(body) do
    body
  end
end
