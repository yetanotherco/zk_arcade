defmodule ZkArcade.SubmissionPoller do
  use GenServer
  require Logger

  @beastTopic "0x" <>
           Base.encode16(
             ExKeccak.hash_256("NewBeastPointsClaimed(address,uint256,uint256)"),
             case: :lower
           )

  @parityTopic "0x" <>
           Base.encode16(
             ExKeccak.hash_256("NewParityPointsClaimed(address,uint256,uint256)"),
             case: :lower
           )

  def start_link(opts \\ []), do: GenServer.start_link(__MODULE__, opts, name: __MODULE__)

  def init(_opts) do
    state = %{last_block: nil}
    schedule_poll()
    {:ok, state}
  end

  # This function is called periodically to poll for new events. It fetches logs from the blockchain, decodes
  # them, and handles the events. If an error occurs, it logs the error and resets the poll cycle.
  def handle_info(:poll, %{last_block: last_block} = state) do
    contract_address = Application.get_env(:zk_arcade, :leaderboard_address)

    rpc_url = Application.get_env(:ethereumex, :url)

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
  # The delay is set to 12 seconds, but can be changed.
  defp schedule_poll, do: Process.send_after(self(), :poll, 12_000)

  # This function fetches logs from the blockchain based on the specified block range and contract address.
  # Constructs a filter for the logs and uses the Ethereumex HTTP client to retrieve them. If successful,
  # returns the logs; otherwise, it returns an error.
  defp fetch_logs(from_block, to_block, contract_address) do
    filter = %{
      address: contract_address,
      fromBlock: "0x" <> Integer.to_string(from_block, 16),
      toBlock: "0x" <> Integer.to_string(to_block, 16),
      topics: [[@beastTopic, @parityTopic]]
    }

    rpc_url = Application.get_env(:ethereumex, :url)

    case Ethereumex.HttpClient.eth_get_logs(filter, url: rpc_url) do
      {:ok, logs} -> {:ok, logs}
      error -> error
    end
  end

  # This function decodes the event logs and handles each event. It iterates through the logs, decodes each log,
  # and calls the `handle_event/1` function to process the decoded event. If decoding fails, it logs a warning.
  defp decode_and_handle_events(logs, _contract_address) do
    for log <- logs do
      Logger.info("Raw log: #{inspect(log)}")

      case decode_event_log(log) do
        {:ok, decoded} ->
          Logger.info("Claim event decoded: #{inspect(decoded)}")
          handle_event(decoded)

        {:error, reason} ->
          Logger.warning("Failed to decode event log: #{inspect(reason)}")
      end
    end
  end

  # This function handles the decoded event by updating the database leaderboard entry.
  defp handle_event(%{user: user, level: level, score: score, event_type: event_type}) do
    Logger.info("New #{event_type} event: user #{user}, level #{level}, score #{score}")

    case ZkArcade.Leaderboard.insert_or_update_entry(%{
           "user_address" => user,
           "score" => score
         }) do
      {:ok, _entry} ->
        Logger.info("Leaderboard entry created/updated successfully for #{event_type}.")

      {:error, changeset} ->
        Logger.error("Failed to create/update leaderboard entry: #{inspect(changeset)}")
    end
  end

  # This function extracts the user address, level, and score from the log data, and determines the event type.
  # If the log format is unexpected, it logs a warning and returns an error.
  defp decode_event_log(%{
         "topics" => [event_sig | _],
         "data" => data
       }) do

    event_type = case event_sig do
      @beastTopic -> "beast_points"
      @parityTopic -> "parity_points"
      _ -> "unknown"
    end

    case event_type do
      "unknown" ->
        Logger.warning("Unknown event signature: #{event_sig}")
        {:error, :unknown_event_type}

      _ ->
        <<user::binary-size(32), level::binary-size(32), score::binary-size(32)>> =
          Base.decode16!(String.trim_leading(data, "0x"), case: :lower)

        user_address =
          user
          |> binary_part(12, 20)
          |> Base.encode16(case: :lower)
          |> then(&("0x" <> &1))

        level_value = :binary.decode_unsigned(level)
        score_value = :binary.decode_unsigned(score)

        {:ok, %{user: user_address, level: level_value, score: score_value, event_type: event_type}}
    end
  end

  defp decode_event_log(log) do
    Logger.warning("Unexpected log format: #{inspect(log)}")
    {:error, :invalid_log_format}
  end
end
