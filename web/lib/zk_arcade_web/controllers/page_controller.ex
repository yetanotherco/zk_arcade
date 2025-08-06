defmodule ZkArcadeWeb.PageController do
  require Logger
  use ZkArcadeWeb, :controller

  defp get_username_and_position(wallet) do
    if !wallet do
      {nil, nil}
    else
      username = ZkArcade.Accounts.get_wallet_username(wallet)
      position =
        case ZkArcade.Leaderboard.get_user_and_position(wallet) do
          %{position: position} -> position
        _ -> nil
      end
      {username, position}
    end
  end

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

  defp get_proofs(nil, page, size), do: []

  defp get_proofs(address, page, size) do
    proofs = ZkArcade.Proofs.get_proofs_by_address(address, %{page: page, page_size: size})

    proofs
  end

  def home(conn, _params) do
    leaderboard = ZkArcade.LeaderboardContract.top10()
    wallet = get_wallet_from_session(conn)
    proofs = get_proofs(wallet, 1, 5)
    proofs_verified = ZkArcade.Proofs.list_proofs()
    total_players = ZkArcade.Accounts.list_wallets()

    # TODO: since all our proofs are from risc0, we can just fetch all the proofs
    # In the future, we'd have to sum the savings of all the proofs for each proving system
    {:ok, eth_price} = ZkArcade.EthPrice.get_eth_price_usd()
    cost_saved = ZkArcade.Utils.calc_aligned_savings(proofs_verified, "risc0", eth_price, 20)
    campaign_started_at_unix_timestamp = Application.get_env(:zk_arcade, :campaign_started_at)
    days = ZkArcade.Utils.date_diff_days(campaign_started_at_unix_timestamp)
    desc = "Last #{days} days"

    top_users = ZkArcade.Leaderboard.get_top_users(10)
    user_in_top? = Enum.any?(top_users, fn u -> u.address == wallet end)

    {username, position} = get_username_and_position(wallet)

    user_data =
      if !user_in_top? && wallet do
        case ZkArcade.Leaderboard.get_user_and_position(wallet) do
          %{user: user, position: position} ->
            %{address: wallet, position: position, score: user.score, username: username}
          _ ->
            nil
        end
      else
        nil
      end

    explorer_url = Application.get_env(:zk_arcade, :explorer_url)

    conn
      |> assign(:submitted_proofs, Jason.encode!(proofs))
      |> assign(:wallet, wallet)
      |> assign(:leaderboard, leaderboard)
      |> assign(:top_users, top_users)
      |> assign(:user_data, user_data)
      |> assign(:statistics, %{proofs_verified: proofs_verified, total_player: total_players, cost_saved: ZkArcade.NumberDisplay.convert_number_to_shorthand(trunc(cost_saved.savings)), desc: desc})
      |> assign(:username, username)
      |> assign(:user_position, position)
      |> assign(:explorer_url, explorer_url)
      |> render(:home)
  end

  def game(conn, %{"name" => _game_name}) do
    wallet = get_wallet_from_session(conn)
    proofs = get_proofs(wallet, 1, 5)
    acknowledgements = [
      %{text: "Original Beast game repository", link: "https://github.com/dominikwilkowski/beast"},
      %{text: "Original Beast game author", link: "https://github.com/dominikwilkowski"}
    ]

    {username, position} = get_username_and_position(wallet)

    explorer_url = Application.get_env(:zk_arcade, :explorer_url)

    user_proofs =
      case proofs do
        [] -> []
        proofs ->
          proofs
          |> Enum.filter(fn proof -> proof.game == "Beast" end)
          |> Enum.map(fn proof ->
            %{
              level: proof.level_reached,
              game_config: proof.game_config
            }
          end)
      end

    user_proofs_json = Jason.encode!(user_proofs)

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
        2. Install Beast with the following command: <span class="code-block">curl -L https://raw.githubusercontent.com/yetanotherco/zk_arcade/main/install_beast.sh | bash</span>
        3. Run the game with the command: <span class="code-block">beast</span>
        4. Locate the generated proof file on your system
        5. Upload your proof to verify your gameplay
        6. After the proof is verified on <span class="text-accent-100">ALIGNED</span>, come back later to submit it to the leaderboard contract to earn points.

        Important notes about proof submissions:

        - You can only submit <span class="text-accent-100">one proof per level</span>. For example, if you've reached level 5 and then try to submit a proof for level 4, it will fail.
        - Each submission must be for a level <span class="text-accent-100">higher than any previously submitted proof</span>. So, if you've already submitted level 5, your next valid submission must be at least level 6.
        - Points are awarded <span class="text-accent-100">per level</span>, not cumulatively. The best strategy is to submit a proof when you’re confident you won’t reach higher levels or after completing the entire game.

        You can uninstall Beast at any time with the command: <span class="code-block">rm $(which beast)</span>
        """,
        acknowledgments: acknowledgements,
        tags: [:cli, :risc0, :sp1]
      })
      |> assign(:username, username)
      |> assign(:user_position, position)
      |> assign(:explorer_url, explorer_url)
      |> assign(:user_proofs_json, user_proofs_json)
      |> render(:game)
  end

  def history(conn, _params) do
    wallet = get_wallet_from_session(conn)
    proofs = get_proofs(wallet, 1, 10)

    {username, position} = get_username_and_position(wallet)

    explorer_url = Application.get_env(:zk_arcade, :explorer_url)

    conn
    |> assign(:wallet, wallet)
    |> assign(:network, Application.get_env(:zk_arcade, :network))
    |> assign(:proofs_sent_total, length(proofs))
    |> assign(:submitted_proofs, Jason.encode!(proofs))
    |> assign(:leaderboard_address, Application.get_env(:zk_arcade, :leaderboard_address))
    |> assign(:payment_service_address, Application.get_env(:zk_arcade, :payment_service_address))
    |> assign(:username, username)
    |> assign(:user_position, position)
    |> assign(:explorer_url, explorer_url)
    |> render(:history)
  end

  def leaderboard(conn, params) do
    wallet = get_wallet_from_session(conn)
    proofs = get_proofs(wallet, 1, 5)

    entries_per_page = 10

    page = String.to_integer(params["page"] || "1")
    offset = (page - 1) * entries_per_page

    top_users = ZkArcade.Leaderboard.get_top_users(entries_per_page, offset)

    total_users = ZkArcade.Leaderboard.get_total_users()
    total_pages = ceil(total_users / entries_per_page)
    has_prev = page > 1
    has_next = page < total_pages

    user_in_current_page? = Enum.any?(top_users, fn u -> u.address == wallet end)

    {username, position} = get_username_and_position(wallet)

    user_data =
      if !user_in_current_page? && wallet do
        case ZkArcade.Leaderboard.get_user_and_position(wallet) do
          %{user: user, position: position} ->
            %{address: wallet, position: position, score: user.score, username: username}
          _ ->
            nil
        end
      else
        nil
      end

    explorer_url = Application.get_env(:zk_arcade, :explorer_url)

    conn
    |> assign(:wallet, wallet)
    |> assign(:submitted_proofs, Jason.encode!(proofs))
    |> assign(:top_users, top_users)
    |> assign(:user_data, user_data)
    |> assign(:user_in_current_page, user_in_current_page?)
    |> assign(:username, username)
    |> assign(:user_position, position)
    |> assign(:explorer_url, explorer_url)
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
