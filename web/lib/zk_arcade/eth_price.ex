defmodule ZkArcade.EthPrice do
  use HTTPoison.Base
  use Agent
  require Logger

  @coingecko_url "https://api.coingecko.com/api/v3"
  @cryptoprices_url "https://cryptoprices.cc/ETH/"
  @cache_ttl :timer.minutes(5)

  def start_link(_opts) do
    case init_fallback_price() do
      {:ok, fallback_price} ->
        Agent.start_link(fn -> fallback_price end, name: __MODULE__)

      {:error, reason} ->
        Logger.error("Failed to initialize ETH price fallback: #{reason}")
        {:error, "Cannot start application without valid ETH price"}
    end
  end

  defp init_fallback_price do
    Logger.info("Fetching initial ETH price for fallback...")

    case fetch_initial_price() do
      {:ok, price} ->
        # Set the cache with initial price
        Cachex.put(:eth_price_cache, :eth_price, price, ttl: @cache_ttl)
        Logger.info("Successfully initialized ETH price fallback: #{price}")
        {:ok, price}

      {:error, reason} ->
        Logger.error("Failed to fetch initial ETH price from all sources: #{reason}")
        {:error, reason}
    end
  end

  defp fetch_initial_price do
    case fetch_from_coingecko() do
      {:ok, price} ->
        {:ok, price}

      {:error, _reason} ->
        case fetch_from_cryptoprices() do
          {:ok, price} ->
            {:ok, price}

          {:error, reason} ->
            {:error, reason}
        end
    end
  end

  defp get_fallback_price do
    Agent.get(__MODULE__, & &1)
  end

  def get_eth_price_usd do
    case Cachex.get(:eth_price_cache, :eth_price) do
      {:ok, nil} ->
        # No cached price, try fetching from APIs
        case fetch_from_coingecko() do
          {:ok, price} ->
            # Successfully fetched from CoinGecko, cache it
            Cachex.put(:eth_price_cache, :eth_price, price, ttl: @cache_ttl)
            {:ok, price}

          {:error, _reason} ->
            # CoinGecko failed, try cryptoprices
            case fetch_from_cryptoprices() do
              {:ok, price} ->
                # Successfully fetched from cryptoprices, cache it
                Cachex.put(:eth_price_cache, :eth_price, price, ttl: @cache_ttl)
                {:ok, price}

              {:error, reason} ->
                # Both APIs failed, log the error and return fallback price from Agent
                Logger.error("Cryptoprices API also failed: #{reason}")
                fallback_price = get_fallback_price()
                Logger.warning("Both API sources failed, using fallback price: #{fallback_price}")
                {:ok, fallback_price}
            end
        end

      {:ok, price} ->
        # Return cached price
        {:ok, price}

      {:error, reason} ->
        # Cache error
        {:error, reason}
    end
  end

  defp fetch_from_coingecko do
    case HTTPoison.get(@coingecko_url <> "/simple/price?ids=ethereum&vs_currencies=usd") do
      {:ok, %HTTPoison.Response{status_code: 200, body: body}} ->
        case parse_coingecko_response(body) do
          {:ok, price} ->
            Logger.info("Successfully fetched ETH price from CoinGecko: #{price}")
            {:ok, price}

          {:error, reason} ->
            Logger.error("Failed to parse CoinGecko response: #{reason}")
            {:error, reason}
        end

      {:ok, %HTTPoison.Response{status_code: status_code}} ->
        Logger.error("CoinGecko API failed with status code: #{status_code}")
        {:error, "CoinGecko API returned status #{status_code}"}

      {:error, %HTTPoison.Error{reason: reason}} ->
        Logger.error("CoinGecko API request failed: #{reason}")
        {:error, "CoinGecko request failed: #{reason}"}
    end
  end

  defp fetch_from_cryptoprices do
    case HTTPoison.get(@cryptoprices_url) do
      {:ok, %HTTPoison.Response{status_code: 200, body: body}} ->
        case parse_cryptoprices_response(body) do
          {:ok, price} ->
            Logger.info("Successfully fetched ETH price from cryptoprices: #{price}")
            {:ok, price}

          {:error, reason} ->
            Logger.error("Failed to parse cryptoprices response: #{reason}")
            {:error, reason}
        end

      {:ok, %HTTPoison.Response{status_code: status_code}} ->
        Logger.error("Cryptoprices API failed with status code: #{status_code}")
        {:error, "Cryptoprices API returned status #{status_code}"}

      {:error, %HTTPoison.Error{reason: reason}} ->
        Logger.error("Cryptoprices API request failed: #{reason}")
        {:error, "Cryptoprices request failed: #{reason}"}
    end
  end

  defp parse_coingecko_response(body) do
    case Jason.decode(body) do
      {:ok, %{"ethereum" => %{"usd" => price}}} ->
        {:ok, price}

      _ ->
        {:error, "Failed to parse CoinGecko response"}
    end
  end

  defp parse_cryptoprices_response(body) do
    # The cryptoprices API returns plain text like "3861.03"
    body
    |> String.trim()
    |> Float.parse()
    |> case do
      {price, ""} when is_float(price) and price > 0 ->
        {:ok, price}

      _ ->
        {:error, "Invalid price format from cryptoprices API"}
    end
  end

  def process_response_body(body) do
    body
  end
end
