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
        game: proof.game,
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
    acknowledgements = [
      %{text: "Original Beast game repository", link: "https://github.com/dominikwilkowski/beast"},
      %{text: "Original Beast game author", link: "https://github.com/dominikwilkowski"}
    ]

    conn
      |> assign(:submitted_proofs, Jason.encode!(proofs))
      |> assign(:wallet, wallet)
      |> assign(:game, %{
        image: "/images/beast1984.webp",
        name: "Beast 1984",
        desc: "Survive across waves of enemies",
        full_desc: "The object of this arcade-like game is to survive through a number of levels while crushing the beasts (├┤) with movable blocks (░░). The beasts are attracted to the player's (◄►) position every move. The beginning levels have only the common beasts, however in later levels the more challenging super-beasts appear (╟╢). These super-beasts are harder to kill as they must be crushed against a static block (▓▓).",
        how_to_play: "1. Install Rust (https://www.rust-lang.org/tools/install).\n2. Install RiscZero toolchain (https://dev.risczero.com/api/zkvm/install)\n3. Clone zk_arcade repository with `git clone https://github.com/yetanotherco/aligned_layer.git`\n4. Play game with `make play_beast`\n5. Locate the generated proof\n6. Upload your proof",
        acknowledgments: acknowledgements,
        tags: [:cli, :risc0]
      })
      |> render(:game)
  end
end
