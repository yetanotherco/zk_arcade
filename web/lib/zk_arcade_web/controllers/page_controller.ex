defmodule ZkArcadeWeb.PageController do
  require Logger
  use ZkArcadeWeb, :controller

  defp get_wallet_from_session(conn) do
     wallet =
      if address = get_session(conn, :wallet_address) do
        case ZkArcade.Accounts.fetch_wallet_by_address(address) do
          {:ok, wallet} -> wallet.address
          _ -> nil
        end
      else
        nil
      end

      wallet
  end

  defp get_proofs(nil), do: []

  defp get_proofs(address) do
    proofs = ZkArcade.Proofs.get_proofs_by_address(address)

    Enum.map(proofs, fn proof ->
      %{
        id: proof.id,
        status: proof.status,
        game: "Beast",
        insertedAt: NaiveDateTime.to_iso8601(proof.inserted_at),
        batchData: proof.batch_data,
        verificationData: proof.verification_data
      }
    end)
  end

  def home(conn, _params) do
    leaderboard = ZkArcade.LeaderboardContract.top10()
    wallet = get_wallet_from_session(conn)
    proofs = get_proofs(wallet)
    proofs_verified = ZkArcade.Proofs.list_proofs() |> length()
    total_players = ZkArcade.Accounts.list_wallets() |> length()
    # TODO: since all our proofs are from risc0, we can just fetch all the proofs
    # In the future, we'd have to sum the savings of all the proofs for each proving system
    {:ok, eth_price} = ZkArcade.EthPrice.get_eth_price_usd()
    cost_saved = ZkArcade.Utils.calc_aligned_savings(proofs_verified, "risc0", eth_price, 20)
    campaign_started_at_unix_timestamp = Application.get_env(:zk_arcade, :campaign_started_at)
    days = ZkArcade.Utils.date_diff_days(campaign_started_at_unix_timestamp)
    desc = "Last #{days} days"


    conn
      |> assign(:submitted_proofs, Jason.encode!(proofs))
      |> assign(:wallet, wallet)
      |> assign(:leaderboard, leaderboard)
      |> assign(:statistics, %{proofs_verified: proofs_verified, total_player: total_players, cost_saved: ZkArcade.NumberDisplay.convert_number_to_shorthand(trunc(cost_saved.savings)), desc: desc})
      |> render(:home)
  end

  def game(conn, %{"name" => _game_name}) do
    wallet = get_wallet_from_session(conn)
    proofs = get_proofs(wallet)

    conn
      |> assign(:submitted_proofs, Jason.encode!(proofs))
      |> assign(:wallet, wallet)
      |> assign(:game, %{
        image: "/images/beast1984.webp",
        name: "Beast 1984",
        desc: "Survive across waves of enemies",
        full_desc: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Proin dapibus, felis sit amet convallis iaculis, felis purus commodo nibh, at sodales velit arcu a odio. Pellentesque dapibus volutpat odio, eu rutrum mauris malesuada et. Aliquam ligula velit, ultricies et mattis quis, ultrices in elit. Nam eget erat finibus, scelerisque purus eleifend, pretium lacus. Nam vitae tellus rhoncus, ornare libero eget, aliquam risus. Morbi lacinia lacinia ultricies. Morbi volutpat sollicitudin eros at vehicula. Pellentesque sed neque luctus, laoreet mi id, luctus est. Vivamus dictum ullamcorper lorem, non hendrerit purus condimentum et. Vestibulum viverra ligula vel lacinia porttitor. Donec blandit, ligula sit amet condimentum accumsan, quam elit sagittis nisl, et commodo lorem justo eget erat. Nam maximus arcu vel nibh feugiat accumsan. Ut aliquam massa ut pulvinar sagittis. Sed dictum mauris nec pretium feugiat. Aliquam erat volutpat. Mauris scelerisque sodales ex vel convallis.",
        how_to_play: "1. Download game base on your platform [here]\n2. Play game\n3. Locate the generated proof\n4. Upload your proof",
        tags: [:cli, :risc0]
      })
      |> render(:game)
  end
end
