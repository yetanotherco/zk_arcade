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
end
