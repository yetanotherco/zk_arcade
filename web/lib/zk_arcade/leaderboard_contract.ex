defmodule ZkArcade.LeaderboardContract do
  require Logger

  use Ethers.Contract,
    abi_file: "lib/abi/Leaderboard.json",
    default_address: Application.get_env(:zk_arcade, :leaderboard_address)

  def top10 do
    {:ok, top10_addresses} = get_top10_score() |> Ethers.call()

      top10_addresses
      |> Enum.with_index(1)
      |> Enum.map(fn {address, position} ->
        {:ok, score} = users_score(address) |> Ethers.call()

        %{
          position: position,
          address: address,
          score: score
        }
      end)
  end
end
