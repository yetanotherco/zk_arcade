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

    top_users = ZkArcade.Leaderboard.get_top_users(10)
    user_in_top? = Enum.any?(top_users, fn u -> u.address == wallet end)

    user_data =
      if !user_in_top? && wallet do
        case ZkArcade.Leaderboard.get_user_and_position(wallet) do
          %{user: user, position: position} ->
            %{address: wallet, position: position, score: user.score}
          _ ->
            nil
        end
      else
        nil
      end

    conn
      |> assign(:submitted_proofs, Jason.encode!(proofs))
      |> assign(:wallet, wallet)
      |> assign(:leaderboard, leaderboard)
      |> assign(:top_users, top_users)
      |> assign(:user_data, user_data)
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
        image: "/images/beast.jpg",
        name: "Beast 1984",
        desc: "Survive across waves of enemies",
        full_desc: "The object of this arcade-like game is to survive through a number of levels while crushing the beasts (├┤) with movable blocks (░░). The beasts are attracted to the player's (◄►) position every move. The beginning levels have only the common beasts, however in later levels the more challenging super-beasts appear (╟╢). These super-beasts are harder to kill as they must be crushed against a static block (▓▓).",
        how_to_play: """
        1. Install Rust by following the official guide: https://www.rust-lang.org/tools/install
        2. Install the RiscZero toolchain: https://dev.risczero.com/api/zkvm/install
        3. Clone the zk_arcade repository using: <span class="code-block">git clone https://github.com/yetanotherco/aligned_layer.git</span>
        4. Run the game with the command: <span class="code-block">make play_beast</span>
        5. Locate the generated proof file on your system
        6. Upload your proof to verify your gameplay
        7. After the proof is verified on <span class="text-accent-100">ALIGNED</span>, come back later to submit it to the leaderboard contract to earn points.

        Important notes about proof submissions:

        - You can only submit <span class="text-accent-100">one proof per level</span>. For example, if you've reached level 5 and then try to submit a proof for level 4, it will fail.
        - Each submission must be for a level <span class="text-accent-100">higher than any previously submitted proof</span>. So, if you've already submitted level 5, your next valid submission must be at least level 6.
        - Points are awarded <span class="text-accent-100">per level</span>, not cumulatively. The best strategy is to submit a proof when you’re confident you won’t reach higher levels or after completing the entire game.
        """,
        acknowledgments: acknowledgements,
        tags: [:cli, :risc0]
      })
      |> render(:game)
  end

  def leaderboard(conn, params) do
    wallet = get_wallet_from_session(conn)
    proofs = get_proofs(wallet)

    entries_per_page = 10

    page = String.to_integer(params["page"] || "1")
    offset = (page - 1) * entries_per_page

    top_users = ZkArcade.Leaderboard.get_top_users(entries_per_page, offset)

    total_users = ZkArcade.Leaderboard.get_total_users()
    total_pages = ceil(total_users / entries_per_page)
    has_prev = page > 1
    has_next = page < total_pages

    user_in_current_page? = Enum.any?(top_users, fn u -> u.address == wallet end)

    user_data =
      if !user_in_current_page? && wallet do
        case ZkArcade.Leaderboard.get_user_and_position(wallet) do
          %{user: user, position: position} ->
            %{address: wallet, position: position, score: user.score}
          _ ->
            nil
        end
      else
        nil
      end

    conn
    |> assign(:wallet, wallet)
    |> assign(:submitted_proofs, Jason.encode!(proofs))
    |> assign(:top_users, top_users)
    |> assign(:user_data, user_data)
    |> assign(:user_in_current_page, user_in_current_page?)
    |> assign(:pagination, %{
      current_page: page,
      total_pages: total_pages,
      has_prev: has_prev,
      has_next: has_next,
      total_users: total_users
    })
    |> render(:leaderboard)
  end
end
