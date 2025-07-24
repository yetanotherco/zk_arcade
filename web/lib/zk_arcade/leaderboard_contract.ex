defmodule ZkArcade.LeaderboardContract do
  require Logger

  use Ethers.Contract,
    abi_file: "lib/abi/Leaderboard.json"

  def top10 do
    address = Application.get_env(:zk_arcade, :leaderboard_address)
    {:ok, top10_addresses} = get_top10_score() |> Ethers.call(to: address)

    top10_addresses
    |> Enum.with_index(1)
    |> Enum.map(fn {address, position} ->
      {:ok, score} = users_score(address) |> Ethers.call(to: address)

      %{
        position: position,
        address: address,
        score: score
      }
    end)
  end
end
