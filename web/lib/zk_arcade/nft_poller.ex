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
          process_range(contract_address, from_block, latest_block, state)
        else
          error ->
            Logger.error("NFT poller failed to fetch latest block: #{inspect(error)}")
            schedule_poll()
            {:noreply, state}
        end
    end
  end

  defp process_range(_contract, from_block, latest_block, state) when from_block > latest_block do
    schedule_poll()
    {:noreply, %{state | from_block: latest_block}}
  end

  defp process_range(contract, from_block, latest_block, state) do
    to_block = min(from_block + @max_block_range - 1, latest_block)

    Logger.info("Polling NFT transfers from block #{from_block} to #{to_block}")

    case fetch_logs(contract, from_block, to_block) do
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

  def fetch_logs(contract_address, from_block, to_block) do
    filter = %{
      address: contract_address,
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

  defp process_logs(logs) do
    Enum.each(logs, &process_log/1)
  end

  defp process_log(%{"topics" => [@transfer_topic, from_topic, to_topic, token_topic]}) do
    from_address = decode_address(from_topic)
    to_address = decode_address(to_topic)
    token_id = decode_token_id(token_topic)

    maybe_remove_token(from_address, token_id)
    maybe_add_token(to_address, token_id)
  rescue
    error ->
      Logger.warning("Failed to process NFT transfer log: #{inspect(error)}")
  end

  defp process_log(_log), do: :ok

  defp maybe_remove_token(nil, _token_id), do: :ok
  defp maybe_remove_token(@zero_address, _token_id), do: :ok
  defp maybe_remove_token(_address, nil), do: :ok

  defp maybe_remove_token(address, token_id) do
    case Accounts.remove_owned_token(address, token_id) do
      {:ok, _} -> :ok
      {:error, reason} -> Logger.warning("Failed to remove token #{token_id} for #{address}: #{inspect(reason)}")
    end
  end

  defp maybe_add_token(nil, _token_id), do: :ok
  defp maybe_add_token(@zero_address, _token_id), do: :ok
  defp maybe_add_token(_address, nil), do: :ok

  defp maybe_add_token(address, token_id) do
    case Accounts.add_owned_token(address, token_id) do
      {:ok, _} -> :ok
      {:error, reason} -> Logger.warning("Failed to add token #{token_id} for #{address}: #{inspect(reason)}")
    end
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
