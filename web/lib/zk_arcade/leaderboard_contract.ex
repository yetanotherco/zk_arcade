defmodule ZkArcade.LeaderboardContract do
  require Logger

  use Ethers.Contract,
    abi_file: "lib/abi/Leaderboard.json"

  def top10 do
    contract_address = Application.get_env(:zk_arcade, :leaderboard_address)
    {:ok, top10_addresses} = get_top10_score() |> Ethers.call(to: contract_address)

    top10_addresses
    |> Enum.with_index(1)
    |> Enum.map(fn {address, position} ->
      {:ok, score} = users_score(address) |> Ethers.call(to: contract_address)

      %{
        position: position,
        address: address,
        score: score
      }
    end)
  end

  def get_user_score(user_address) do
    contract_address = Application.get_env(:zk_arcade, :leaderboard_address)
    {:ok, score} = users_score(user_address) |> Ethers.call(to: contract_address)
    score
  end

  def get_current_game_idx(game) do
    contract_address = Application.get_env(:zk_arcade, :leaderboard_address)

    case game do
      "Parity" ->
        {:ok, [_game_config, game_idx]} = get_current_parity_game() |> Ethers.call(to: contract_address)
        Logger.info("Current Parity game idx: #{inspect(game_idx)}")
        game_idx

      "Beast" ->
        {:ok, [_game_config, game_idx]} = get_current_beast_game() |> Ethers.call(to: contract_address)
        Logger.info("Current Beast game idx: #{inspect(game_idx)}")
        game_idx
      _ -> {:error, :unknown_game}
    end
  end

  @doc """
  Returns the startsAtTime (unix seconds) for the next Beast game, or nil if there is no next game.

  Mirrors the client logic: when the current index is 0, it uses index 0; otherwise uses current_index + 1.
  """
  def get_next_beast_game_starts_at do
    contract_address = Application.get_env(:zk_arcade, :leaderboard_address)

    with {:ok, [_game, current_idx]} <- get_current_beast_game() |> Ethers.call(to: contract_address) do
      target_idx = if current_idx == 0, do: 0, else: current_idx + 1

      case beast_games(target_idx) |> Ethers.call(to: contract_address) do
        {:ok, [_, _game_config, starts_at_time]} -> starts_at_time
        {:error, _reason} -> nil
      end
    else
      _ -> nil
    end
  end
end
