defmodule ZkArcade.NftPoller do
  use GenServer
  require Logger

  alias ZkArcade.Accounts

  @transfer_topic "0x" <>
                     Base.encode16(
                       ExKeccak.hash_256("Transfer(address,address,uint256)"),
                       case: :lower
                     )
  @zero_address "0x0000000000000000000000000000000000000000"
  @max_block_range 50_000
  @poll_interval 12_000

  def start_link(opts \\ []) do
    GenServer.start_link(__MODULE__, opts, name: __MODULE__)
  end

  @impl true
  def init(_opts) do
    rpc_url = Application.get_env(:ethereumex, :url)

    from_block =
      case Ethereumex.HttpClient.eth_block_number(url: rpc_url) do
        {:ok, latest_hex} ->
          hex_to_integer(latest_hex)

        {:error, reason} ->
          Logger.warning("NFT poller failed to fetch latest block on init: #{inspect(reason)}")
          0
      end

    schedule_poll(0)
    {:ok, %{from_block: from_block}}
  end

  @impl true
  def handle_info(:poll, %{from_block: from_block} = state) do
    contract_address = Application.get_env(:zk_arcade, :nft_contract_address)
    public_contract_address = Application.get_env(:zk_arcade, :public_nft_contract_address)
    rpc_url = Application.get_env(:ethereumex, :url)

    cond do
      is_nil(contract_address) ->
        Logger.warning("NFT poller missing contract address configuration")
        schedule_poll()
        {:noreply, state}

      true ->
        with {:ok, latest_hex} <- Ethereumex.HttpClient.eth_block_number(url: rpc_url),
             latest_block <- hex_to_integer(latest_hex) do
          from_block = max(from_block - 10, 0)
          process_range(contract_address, public_contract_address, from_block, latest_block, state)
        else
          error ->
            Logger.error("NFT poller failed to fetch latest block: #{inspect(error)}")
            schedule_poll()
            {:noreply, state}
        end
    end
  end

  defp process_range(_contract, _public_contract, from_block, latest_block, state) when from_block > latest_block do
    schedule_poll()
    {:noreply, %{state | from_block: latest_block}}
  end

  defp process_range(contract, public_contract, from_block, latest_block, state) do
    to_block = min(from_block + @max_block_range - 1, latest_block)

    Logger.info("Polling NFT transfers from block #{from_block} to #{to_block}")

    case fetch_logs(contract, public_contract, from_block, to_block) do
      {:ok, logs} ->
        process_logs(logs)
        schedule_poll()
        {:noreply, %{state | from_block: to_block + 1}}

      {:error, reason} ->
        Logger.error("NFT poller failed to fetch logs: #{inspect(reason)}")
        schedule_poll()
        {:noreply, state}
      end
  end

  def fetch_logs(contract_address, public_contract_address, from_block, to_block) do
    # Filter out 0x0 addresses to avoid unnecessary queries
    addresses = [contract_address, public_contract_address]
    |> Enum.filter(&(&1 != "0x0"))

    # If no valid addresses, return empty logs
    if Enum.empty?(addresses) do
      {:ok, []}
    else
      filter = %{
        address: addresses,
        fromBlock: integer_to_hex(from_block),
        toBlock: integer_to_hex(to_block),
        topics: [[@transfer_topic]]
      }

      rpc_url = Application.get_env(:ethereumex, :url)

      case Ethereumex.HttpClient.eth_get_logs(filter, url: rpc_url) do
        {:ok, logs} -> {:ok, logs}
        error -> error
      end
    end
  end

  defp process_logs(logs) do
    contract_address = config_address(:nft_contract_address)
    public_contract_address = config_address(:public_nft_contract_address)

    Enum.each(logs, &process_log(&1, contract_address, public_contract_address))
  end

  defp process_log(%{"address" => log_address, "topics" => [@transfer_topic, from_topic, to_topic, token_topic]}, contract_address, public_contract_address) do
    token_id = decode_token_id(token_topic)

    from_topic
    |> decode_address()
    |> maybe_remove_token(token_id)

    to_address = decode_address(to_topic)

    case maybe_add_token(to_address, token_id) do
      :ok -> increment_mint_metric(log_address, contract_address, public_contract_address, to_address)
      _ -> :ok
    end
  rescue
    error ->
      Logger.warning("Failed to process NFT transfer log: #{inspect(error)}")
  end

  defp process_log(_log, _contract_address, _public_contract_address), do: :ok

  defp maybe_remove_token(nil, _token_id), do: :ok
  defp maybe_remove_token(@zero_address, _token_id), do: :ok
  defp maybe_remove_token(_address, nil), do: :ok

  defp maybe_remove_token(address, token_id) do
    case Accounts.remove_owned_token(address, token_id) do
      {:ok, _} -> :ok
      {:error, reason} -> Logger.warning("Failed to remove token #{token_id} for #{address}: #{inspect(reason)}")
    end
  end

  defp maybe_add_token(nil, _token_id), do: {:error, :invalid_address}
  defp maybe_add_token(@zero_address, _token_id), do: {:error, :invalid_address}
  defp maybe_add_token(_address, nil), do: {:error, :invalid_token}

  defp maybe_add_token(address, token_id) do
    case Accounts.add_owned_token(address, token_id) do
      {:ok, :no_change} ->
        {:ok, :no_change}
      {:ok, _} ->
        :ok
      {:error, reason} ->
        Logger.warning("Failed to add token #{token_id} for #{address}: #{inspect(reason)}")
        {:error, reason}
    end
  end

  defp increment_mint_metric(log_address, contract_address, public_contract_address, to_address) do
    log_address
    |> normalize_address()
    |> case do
      addr when not is_nil(public_contract_address) and addr == public_contract_address ->
        increment_public_mint_metric(to_address)

      addr when not is_nil(contract_address) and addr == contract_address ->
        ZkArcade.PrometheusMetrics.increment_nft_mints()

      _ ->
        :ok
    end
  end

  defp increment_public_mint_metric(address) do
    address
    |> eligible_for_discount?()
    |> case do
      true -> ZkArcade.PrometheusMetrics.increment_public_nft_mints_with_discount()
      false -> ZkArcade.PrometheusMetrics.increment_public_nft_mints_without_discount()
    end
  end

  defp eligible_for_discount?(address) do
    address
    |> normalize_address()
    |> case do
      nil -> false
      normalized -> ZkArcade.PublicMerklePaths.get_eligiblity_for_address(normalized)
    end
  end

  defp config_address(key) do
    Application.get_env(:zk_arcade, key) |> normalize_address()
  end

  defp decode_address("0x" <> topic) when byte_size(topic) >= 40 do
    topic
    |> String.slice(-40, 40)
    |> String.downcase()
    |> then(&("0x" <> &1))
  end

  defp decode_address(_), do: nil

  defp decode_token_id("0x" <> topic) do
    String.to_integer(topic, 16)
  rescue
    _ -> nil
  end

  defp decode_token_id(_), do: nil

  defp normalize_address(nil), do: nil
  defp normalize_address(address) when is_binary(address), do: String.downcase(address)

  defp integer_to_hex(int) when int < 0, do: "0x0"

  defp integer_to_hex(int) do
    "0x" <> Integer.to_string(int, 16)
  end

  defp hex_to_integer("0x" <> hex), do: String.to_integer(hex, 16)
  defp hex_to_integer(hex), do: String.to_integer(hex, 16)

  defp schedule_poll(delay \\ @poll_interval) do
    Process.send_after(self(), :poll, delay)
  end
end
