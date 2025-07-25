defmodule ZkArcade.SubmissionPoller do
  use GenServer
  require Logger

  @topic "0x" <>
           Base.encode16(ExKeccak.hash_256("NewSolutionSubmitted(address,uint256)"), case: :lower)

  def start_link(opts \\ []), do: GenServer.start_link(__MODULE__, opts, name: __MODULE__)

  def init(_opts) do
    state = %{last_block: nil}
    schedule_poll()
    {:ok, state}
  end

  def handle_info(:poll, %{last_block: last_block} = state) do
    contract_address = Application.get_env(:zk_arcade, :leaderboard_address)

    rpc_url = Application.get_env(:zk_arcade, :rpc_url, "http://localhost:8545")

    with {:ok, latest_block} <- Ethereumex.HttpClient.eth_block_number(url: rpc_url),
         latest_block_int <- String.to_integer(String.trim_leading(latest_block, "0x"), 16) do
      from_block =
        if last_block do
          last_block + 1
        else
          latest_block_int - 20
        end

      with {:ok, logs} <- fetch_logs(from_block, latest_block_int, contract_address) do
        decode_and_handle_events(logs, contract_address)

        new_state = %{state | last_block: latest_block_int}
        schedule_poll()
        {:noreply, new_state}
      else
        error ->
          Logger.error("Polling failed: #{inspect(error)}")
          schedule_poll()
          {:noreply, state}
      end
    else
      error ->
        Logger.error("Polling failed: #{inspect(error)}")
        schedule_poll()
        {:noreply, state}
    end
  end

  # This method restarts the polling process by sending a message to itself after a delay.
  # The delay is set to 10 seconds, but can be changed.
  defp schedule_poll, do: Process.send_after(self(), :poll, 10_000)

  defp fetch_logs(from_block, to_block, contract_address) do
    filter = %{
      address: contract_address,
      fromBlock: "0x" <> Integer.to_string(from_block, 16),
      toBlock: "0x" <> Integer.to_string(to_block, 16),
      topics: [@topic]
    }

    rpc_url = Application.get_env(:zk_arcade, :rpc_url, "http://localhost:8545")

    case Ethereumex.HttpClient.eth_get_logs(filter, url: rpc_url) do
      {:ok, logs} -> {:ok, logs}
      error -> error
    end
  end

  defp decode_and_handle_events(logs, _contract_address) do
    for log <- logs do
      Logger.info("Raw log: #{inspect(log)}")

      case decode_event_log(log) do
        {:ok, decoded} ->
          Logger.info("NewSolutionSubmitted: #{inspect(decoded)}")
          handle_event(decoded)

        {:error, reason} ->
          Logger.warning("Failed to decode event log: #{inspect(reason)}")
      end
    end
  end

  defp handle_event(%{user: user, level: level}) do
    Logger.info("New solution submitted by #{user} for level #{level}")

    current_score = ZkArcade.LeaderboardContract.get_user_score(user)
    Logger.info("New score for #{user}: #{current_score}")

    case ZkArcade.Leaderboard.insert_or_update_entry(%{
      "user_address" => user,
      "score" => level
    }) do
      {:ok, _entry} ->
        Logger.info("Leaderboard entry created/updated successfully.")

      {:error, changeset} ->
        Logger.error("Failed to create/update leaderboard entry: #{inspect(changeset)}")
    end
  end

  defp decode_event_log(%{
         "topics" => [_event_sig],
         "data" => data
       }) do
    <<user::binary-size(32), level::binary-size(32)>> =
      Base.decode16!(String.trim_leading(data, "0x"), case: :lower)

    user_address =
      user
      |> binary_part(12, 20)
      |> Base.encode16(case: :lower)
      |> then(&("0x" <> &1))

    level_value = :binary.decode_unsigned(level)

    {:ok, %{user: user_address, level: level_value}}
  end

  defp decode_event_log(log) do
    Logger.warning("Unexpected log format: #{inspect(log)}")
    {:error, :invalid_log_format}
  end
end
