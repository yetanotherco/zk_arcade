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


  defp get_proofs(address, page, size) do
    proofs = ZkArcade.Proofs.get_proofs_by_address(address, %{page: page, page_size: size})

    proofs
  end

  defp build_redirect_url(conn, message) do
    referer = get_req_header(conn, "referer") |> List.first() || "/"
    uri = URI.parse(referer)

    query_params =
      case uri.query do
        nil -> %{}
        q -> URI.decode_query(q)
      end

    new_query =
      query_params
      |> Map.put("message", message)
      |> URI.encode_query()

    uri.path <> "?" <> new_query
  end

  defp get_user_eligibility(nil) do
    "false"
  end

  defp get_user_eligibility(address) do
    case ZkArcade.MerklePaths.get_merkle_proof_for_address(address) do
        {:ok, _proof, _index} -> "true"
        {:error, :proof_not_found} -> "false"
        _ -> "false"
    end
  end

  def home(conn, _params) do
    leaderboard = ZkArcade.LeaderboardContract.top10()
    wallet = get_wallet_from_session(conn)
    proofs = get_proofs(wallet, 1, 5)
    proofs_verified = ZkArcade.Proofs.list_proofs()
    total_players = ZkArcade.Accounts.list_wallets()

    # TODO: since all our proofs are from risc0, we can just fetch all the proofs
    # In the future, we'd have to sum the savings of all the proofs for each proving system
    eth_price = case ZkArcade.EthPrice.get_eth_price_usd() do
      {:ok, price} ->
        price
      {:error, reason} ->
        Logger.error("Failed to get ETH price: #{reason}")
    end
    cost_saved = ZkArcade.Utils.calc_aligned_savings(proofs_verified, "risc0", eth_price, 20)
    campaign_started_at_unix_timestamp = Application.get_env(:zk_arcade, :campaign_started_at)
    days = ZkArcade.Utils.date_diff_days(campaign_started_at_unix_timestamp)
    desc = "Last #{days} days"
    total_claimed_points = ZkArcade.Leaderboard.count_total_claimed_points()
    proofs_per_player = if total_players > 0 do
        div(proofs_verified, total_players)
      else
        0
      end

    avg_savings_per_proof =
      if proofs_verified > 0 do
        div(trunc(cost_saved.savings), proofs_verified)
      else
        0
      end

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

    faqs = [
      %{
        number: "01",
        question: "Why do I need a wallet to play?",
        answer: "Your wallet is your identity in ZK Arcade. It allows you to deposit ETH into Aligned to pay for proof verification, claim your points on the leaderboard, and keep all your progress securely tied to your address."
      },
      %{
        number: "01",
        question: "Why do I need to mint an NFT?",
        answer: "Minting the NFT proves your eligibility and grants access to participate in ZK Arcade. Without it, you cannot submit proofs or earn points on the leaderboard."
      },
      %{
        number: "02",
        question: "Do I need to be eligible to mint?",
        answer: "Yes. Only addresses that meet the eligibility requirements can mint the NFT. Make sure your address qualifies before trying to mint."
      },
      %{
        number: "03",
        question: "What does the NFT do after I mint it?",
        answer: "The NFT acts as your participation ticket. It ties your identity to the game, allowing you to claim points in the global leaderboard."
      },
      %{
        number: "04",
        question: "Do I need to mint a new NFT for each challenge?",
        answer: "No. You only need to mint the NFT once. After that, it continues to serve as your participation ticket for new challenges."
      },
      %{
        number: "05",
        question: "Can I transfer or sell the NFT?",
        answer: "No. The NFT is non-transferable. It’s permanently tied to the wallet that minted it to preserve fair participation and prevent selling or lending access."
      },
      %{
        number: "06",
        question: "Why do I need to verify my proofs?",
        answer: "Verification guarantees that your results are valid and are not tampered with. It ensures the leaderboard reflects the player's real skills, and not manipulated outcomes."
      },
      %{
        number: "07",
        question: "Can I resubmit a proof for a lower level?",
        answer: "No. You can only submit one proof per level, and each new proof must be for a higher level than the last one submitted for the daily game."
      },
      %{
        number: "08",
        question: "What happens if my proof submission fails?",
        answer: "If a proof fails verification, it won’t count toward your score. You can generate a new valid proof and resubmit."
      },
      %{
        number: "09",
        question: "How do I earn points on the leaderboard?",
        answer: "Points are awarded per verified level on each day. The higher the level you submit a valid proof for, the more points you receive for it."
      },
      %{
        number: "10",
        question: "Is my gameplay data public?",
        answer: "No. Only your proof and score are submitted. Zero-knowledge proofs allow verification without exposing your full gameplay data."
      },
      %{
        number: "11",
        question: "How often are new challenges released?",
        answer: "A new challenge is available every day for each game!"
      },
    ]

    eligible = get_user_eligibility(wallet)

    conn
      |> assign(:submitted_proofs, Jason.encode!(proofs))
      |> assign(:wallet, wallet)
      |> assign(:leaderboard, leaderboard)
      |> assign(:top_users, top_users)
      |> assign(:user_data, user_data)
      |> assign(:statistics, %{
          proofs_verified: proofs_verified,
          total_player: total_players,
          cost_saved: ZkArcade.NumberDisplay.convert_number_to_shorthand(trunc(cost_saved.savings)),
          total_claimed_points: total_claimed_points,
          proofs_per_player: proofs_per_player,
          avg_savings_per_proof: avg_savings_per_proof,
          desc: desc
        })
      |> assign(:username, username)
      |> assign(:user_position, position)
      |> assign(:explorer_url, explorer_url)
      |> assign(:faqs, faqs)
      |> assign(:eligible, eligible)
      |> render(:home)
  end

  def games(conn, _params) do
    wallet = get_wallet_from_session(conn)
    eligible = get_user_eligibility(wallet)
    proofs = get_proofs(wallet, 1, 5)
    explorer_url = Application.get_env(:zk_arcade, :explorer_url)
    {username, position} = get_username_and_position(wallet)

    conn
      |> assign(:submitted_proofs, Jason.encode!(proofs))
      |> assign(:wallet, wallet)
      |> assign(:username, username)
      |> assign(:user_position, position)
      |> assign(:explorer_url, explorer_url)
      |> assign(:eligible, eligible)
      |> render(:games)
  end

  def game(conn, %{"name" => "beast"}) do
    wallet = get_wallet_from_session(conn)
    explorer_url = Application.get_env(:zk_arcade, :explorer_url)
    eligible = get_user_eligibility(wallet)
    proofs = get_proofs(wallet, 1, 5)
    acknowledgements = [
      %{text: "Original Beast game repository", link: "https://github.com/dominikwilkowski/beast"},
      %{text: "Original Beast game author", link: "https://github.com/dominikwilkowski"}
    ]

    {username, position} = get_username_and_position(wallet)

    game_idx = ZkArcade.LeaderboardContract.get_current_game_idx("Beast")

    highest_level_reached_proof = if wallet do ZkArcade.Proofs.get_highest_level_proof(wallet, game_idx, "Beast") else nil end

    conn
      |> assign(:submitted_proofs, Jason.encode!(proofs))
      |> assign(:wallet, wallet)
      |> assign(:eligible, eligible)
      |> assign(:game, %{
        image: "/images/beast.png",
        name: "Beast 1984",
        desc: "Survive across waves of enemies",
        full_desc: "The object of this arcade-like game is to survive through a number of levels while crushing the beasts (├┤) with movable blocks (░░). The beasts are attracted to the player's (◄►) position every move. The beginning levels have only the common beasts, however in later levels the more challenging super-beasts appear (╟╢). These super-beasts are harder to kill as they must be crushed against a static block (▓▓).",
        how_to_play: """
        1. Install Beast:
          - Windows: Download the portable executable:
          #{Application.get_env(:zk_arcade, :beast_windows_download_url)}
          - Linux/MacOS: Run the following command:
          <span class="code-block">curl -L #{Application.get_env(:zk_arcade, :beast_bash_download_url)} | bash</span>

        2. Start playing: Run the game with the command: <span class="code-block">#{Application.get_env(:zk_arcade, :beast_bash_command)}</span>. When prompted, enter the same Ethereum address you use on ZK Arcade (the wallet that holds your Ticket NFT).

        3. Find your proof: After completing levels, locate the generated proof file on your system.
           - Windows: The proof file is saved alongside <span class="code-block">beast.exe</span> (for example <span class="code-block">C:\\Users\\&lt;you&gt;\\Downloads\\beast\\sp1_solution_YYYY-MM-DD_HH-MM-SS.bin</span>).
           - macOS/Linux: The proof file is written to the directory where you launched <span class="code-block">beast</span> (for most people that's the home directory, e.g. <span class="code-block">~/sp1_solution_YYYY-MM-DD_HH-MM-SS.bin</span>).

        4. Fund verification: Deposit ETH into <span class="text-accent-100">ALIGNED</span> to pay for proof verification

        5. Verify your proof: Upload your proof to verify your gameplay

        6. Claim points: After the proof is verified on <span class="text-accent-100">ALIGNED</span>, return here to submit it to the leaderboard and earn points

        Important submission rules:

        - You can only submit <span class="text-accent-100">one proof per level</span>. If you've reached level 5, you cannot later submit a proof for level 4.
        - Each new submission must be for a <span class="text-accent-100">higher level than your previous submission</span>. If you've submitted level 5, your next valid submission must be at least level 6.
        - Points are awarded <span class="text-accent-100">per level achieved</span>, not cumulatively. Submit strategically when you're confident you won't reach higher levels, or after completing the entire game.

        Uninstall: Remove Beast anytime with: <span class="code-block">rm $(which beast)</span>
        """,
        acknowledgments: acknowledgements,
        tags: [:cli, :sp1, :hard],
        secondary_tags: [:beast_daily_points]
      })
      |> assign(:username, username)
      |> assign(:user_position, position)
      |> assign(:explorer_url, explorer_url)
      |> assign(:highest_level_reached, if highest_level_reached_proof do highest_level_reached_proof.level_reached else 0 end)
      |> render(:beast_game)
  end

  def game(conn, %{"name" => "parity"}) do
    wallet = get_wallet_from_session(conn)
    explorer_url = Application.get_env(:zk_arcade, :explorer_url)
    eligible = get_user_eligibility(wallet)
    acknowledgements = [
      %{text: "Original Parity game repository", link: "https://github.com/abejfehr/parity/"},
      %{text: "Original Parity game author", link: "https://github.com/abejfehr"}
    ]
    {username, position} = get_username_and_position(wallet)
    proofs = get_proofs(wallet, 1, 5)

    game_idx = ZkArcade.LeaderboardContract.get_current_game_idx("Parity")

    highest_level_reached_proof = if wallet do ZkArcade.Proofs.get_highest_level_proof(wallet, game_idx, "Parity") else nil end

    conn
      |> assign(:wallet, wallet)
      |> assign(:eligible, eligible)
      |> assign(:game, %{
        image: "/images/parity.png",
        name: "Parity",
        desc: "Daily parity puzzles in your browser. Simple rules, tricky patterns. Test your logic and stay sharp as difficulty builds.",
        full_desc: "The game is played by moving a cursor with WASD around the board to select different squares in a grid. Each time you select a select a cell by moving the cursor with the arrow keys, the number inside that cell increases by one.

The goal of the game is to make each number on the board equal.
",
        acknowledgments: acknowledgements,
        tags: [:browser, :circom, :easy],
        secondary_tags: [:parity_daily_points]
      })
      |> assign(:username, username)
      |> assign(:submitted_proofs, Jason.encode!(proofs))
      |> assign(:user_position, position)
      |> assign(:explorer_url, explorer_url)
      |> assign(:highest_level_reached, if highest_level_reached_proof do highest_level_reached_proof.level_reached else 0 end)
      |> render(:parity_game)
  end

  def history(conn, params) do
    case get_wallet_from_session(conn) do
      nil -> conn |> redirect(to: build_redirect_url(conn, "user-not-connected"))
      wallet ->
        entries_per_page = 5

        page = String.to_integer(params["page"] || "1")

        total_proofs = ZkArcade.Proofs.get_total_proofs_by_address(wallet)

        total_pages = ceil(total_proofs / entries_per_page)
        has_prev = page > 1
        has_next = page < total_pages

        proofs = get_proofs(wallet, page, entries_per_page)

        {username, position} = get_username_and_position(wallet)

        explorer_url = Application.get_env(:zk_arcade, :explorer_url)
        batcher_url = Application.get_env(:zk_arcade, :batcher_url)
        eligible = get_user_eligibility(wallet)

        conn
        |> assign(:wallet, wallet)
        |> assign(:eligible, eligible)
        |> assign(:network, Application.get_env(:zk_arcade, :network))
        |> assign(:proofs_sent_total, total_proofs)
        |> assign(:submitted_proofs, Jason.encode!(proofs))
        |> assign(:leaderboard_address, Application.get_env(:zk_arcade, :leaderboard_address))
        |> assign(:nft_contract_address, Application.get_env(:zk_arcade, :nft_contract_address))
        |> assign(:payment_service_address, Application.get_env(:zk_arcade, :payment_service_address))
        |> assign(:username, username)
        |> assign(:user_position, position)
        |> assign(:explorer_url, explorer_url)
        |> assign(:batcher_url, batcher_url)
        |> assign(:pagination, %{
          current_page: page,
          total_pages: total_pages,
          has_prev: has_prev,
          has_next: has_next,
          total_users: total_proofs,
          items_per_page: entries_per_page
        })
        |> render(:history)
    end
  end

  def leaderboard(conn, params) do
    wallet = get_wallet_from_session(conn)
    eligible = get_user_eligibility(wallet)
    proofs = get_proofs(wallet, 1, 10)

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
    |> assign(:eligible, eligible)
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
      total_users: total_users,
      items_per_page: entries_per_page
    })
    |> render(:leaderboard)
  end

  def mint(conn, _params) do
    wallet = get_wallet_from_session(conn)
    eligible = get_user_eligibility(wallet)
    proofs = get_proofs(wallet, 1, 10)
    {username, position} = get_username_and_position(wallet)
    explorer_url = Application.get_env(:zk_arcade, :explorer_url)

    conn
    |> assign(:network, Application.get_env(:zk_arcade, :network))
    |> assign(:wallet, wallet)
    |> assign(:nft_contract_address, Application.get_env(:zk_arcade, :nft_contract_address))
    |> assign(:eligible, eligible)
    |> assign(:submitted_proofs, Jason.encode!(proofs))
    |> assign(:username, username)
    |> assign(:user_position, position)
    |> assign(:explorer_url, explorer_url)
    |> render(:mint)
  end
end
