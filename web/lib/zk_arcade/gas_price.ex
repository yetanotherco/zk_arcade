defmodule ZkArcade.GasPrice do
  @moduledoc """
  Module for fetching current gas prices from the Ethereum network.
  """

  require Logger

  @cache_ttl :timer.seconds(30)
  @gwei_multiplier 1_000_000_000

  @doc """
  Gets the current gas price from the Ethereum network in gwei.
  """
  def get_gas_price_gwei do
    case Cachex.get(:gas_price_cache, :gas_price) do
      {:ok, nil} ->
        fetch_and_cache_gas_price()

      {:ok, gas_price_gwei} ->
        {:ok, gas_price_gwei}

      {:error, reason} ->
        Logger.error("Cache error when fetching gas price: #{inspect(reason)}")
        fetch_and_cache_gas_price()
    end
  end

  defp fetch_and_cache_gas_price do
    case fetch_gas_price() do
      {:ok, gas_price_wei} ->
        gas_price_gwei = wei_to_gwei(gas_price_wei)
        
        # Cache the result
        Cachex.put(:gas_price_cache, :gas_price, gas_price_gwei, ttl: @cache_ttl)
        
        Logger.info("Current gas price: #{Float.round(gas_price_gwei, 1)} gwei")
        {:ok, gas_price_gwei}

      {:error, reason} ->
        Logger.error("Failed to fetch gas price: #{inspect(reason)}")
        {:error, reason}
    end
  end

  defp fetch_gas_price do
    try do
      case Ethereumex.HttpClient.eth_gas_price() do
        {:ok, gas_price_hex} ->
          gas_price_wei = hex_to_integer(gas_price_hex)
          {:ok, gas_price_wei}

        {:error, reason} ->
          Logger.error("Ethereum RPC call failed: #{inspect(reason)}")
          {:error, reason}
      end
    rescue
      error ->
        Logger.error("Exception while fetching gas price: #{inspect(error)}")
        {:error, error}
    end
  end

  defp wei_to_gwei(wei_value) do
    wei_value / @gwei_multiplier
  end

  defp hex_to_integer("0x" <> hex_string) do
    String.to_integer(hex_string, 16)
  end

  defp hex_to_integer(hex_string) do
    String.to_integer(hex_string, 16)
  end
end