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

  defp get_proofs_and_submissions(address, page, size) do
    proofs = ZkArcade.Proofs.get_proofs_by_address(address, %{page: page, page_size: size})

    beast_submissions =
      case proofs do
        [] -> []
        proofs ->
          # TODO: Pass the levels for the current game only, not all of them. This will be easier when we
          # monitor the current game in the backend, logic not developed yet
          proofs
          |> Enum.filter(fn proof -> proof.game == "Beast" end)
          |> Enum.filter(fn proof -> proof.status != "failed" end)
          |> Enum.map(fn proof ->
            %{
              level: proof.level_reached,
              game_config: proof.game_config
            }
          end)
      end

    beast_submissions_json = Jason.encode!(beast_submissions)

    {proofs, beast_submissions_json}
  end

  def home(conn, _params) do
    leaderboard = ZkArcade.LeaderboardContract.top10()
    wallet = get_wallet_from_session(conn)
    {proofs, beast_submissions_json} = get_proofs_and_submissions(wallet, 1, 5)
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
    users_online = ZkArcade.Proofs.count_pending_proofs()
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
        number: "02",
        question: "Why do I need to verify my proofs?",
        answer: "Verification guarantees that your results are valid and are not tampered with. It ensures the leaderboard reflects the player's real skills, and not manipulated outcomes."
      },
      %{
        number: "03",
        question: "Can I resubmit a proof for a lower level?",
        answer: "No. You can only submit one proof per level, and each new proof must be for a higher level than the last one submitted for the daily game."
      },
      %{
        number: "04",
        question: "What happens if my proof submission fails?",
        answer: "If a proof fails verification, it won’t count toward your score. You can generate a new valid proof and resubmit."
      },
      %{
        number: "05",
        question: "How do I earn points on the leaderboard?",
        answer: "Points are awarded per verified level on each day. The higher the level you submit a valid proof for, the more points you receive for it."
      },
      %{
        number: "06",
        question: "Is my gameplay data public?",
        answer: "No. Only your proof and score are submitted. Zero-knowledge proofs allow verification without exposing your full gameplay data."
      },
      %{
        number: "07",
        question: "How often are new challenges released?",
        answer: "There is available a new challenge everyday for each game!"
      },
      %{
        number: "08",
        question: "Can I play on mobile?",
        answer: "Browser-based games will be mobile-friendly, but Beast 1984 game requires a desktop environment with a bash terminal."
      },
    ]

    conn
      |> assign(:submitted_proofs, Jason.encode!(proofs))
      |> assign(:beast_submissions, beast_submissions_json)
      |> assign(:wallet, wallet)
      |> assign(:leaderboard, leaderboard)
      |> assign(:top_users, top_users)
      |> assign(:user_data, user_data)
      |> assign(:statistics, %{
          proofs_verified: proofs_verified,
          total_player: total_players,
          cost_saved: ZkArcade.NumberDisplay.convert_number_to_shorthand(trunc(cost_saved.savings)),
          users_online: users_online,
          proofs_per_player: proofs_per_player,
          avg_savings_per_proof: avg_savings_per_proof,
          desc: desc
        })
      |> assign(:username, username)
      |> assign(:user_position, position)
      |> assign(:explorer_url, explorer_url)
      |> assign(:faqs, faqs)
      |> render(:home)
  end

  def game(conn, %{"name" => "beast"}) do
    wallet = get_wallet_from_session(conn)
    explorer_url = Application.get_env(:zk_arcade, :explorer_url)
    {proofs, beast_submissions_json} = get_proofs_and_submissions(wallet, 1, 5)
    acknowledgements = [
      %{text: "Original Beast game repository", link: "https://github.com/dominikwilkowski/beast"},
      %{text: "Original Beast game author", link: "https://github.com/dominikwilkowski"}
    ]

    {username, position} = get_username_and_position(wallet)

    conn
      |> assign(:submitted_proofs, Jason.encode!(proofs))
      |> assign(:wallet, wallet)
      |> assign(:game, %{
        image: "/images/beast.jpg",
        name: "Beast 1984",
        desc: "Survive across waves of enemies",
        full_desc: "The object of this arcade-like game is to survive through a number of levels while crushing the beasts (├┤) with movable blocks (░░). The beasts are attracted to the player's (◄►) position every move. The beginning levels have only the common beasts, however in later levels the more challenging super-beasts appear (╟╢). These super-beasts are harder to kill as they must be crushed against a static block (▓▓).",
        how_to_play: """
        1. Install Beast:
          - Windows: Download the portable executable:
          #{Application.get_env(:zk_arcade, :beast_windows_download_url)}
          - Linux/MacOS: Run the following command:
          <span class="code-block">curl -L https://raw.githubusercontent.com/yetanotherco/zk_arcade/main/install_beast.sh | bash</span>

        2. Start playing: Run the game with the command: <span class="code-block">beast</span>

        3. Find your proof: After completing levels, locate the generated proof file on your system

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
        tags: [:cli, :risc0, :sp1]
      })
      |> assign(:username, username)
      |> assign(:user_position, position)
      |> assign(:explorer_url, explorer_url)
      |> assign(:beast_submissions, beast_submissions_json)
      |> render(:beast_game)
  end

  def game(conn, %{"name" => "parity"}) do
    wallet = get_wallet_from_session(conn)
    explorer_url = Application.get_env(:zk_arcade, :explorer_url)
    acknowledgements = [
      %{text: "Original Beast game repository", link: "https://github.com/dominikwilkowski/beast"},
      %{text: "Original Beast game author", link: "https://github.com/dominikwilkowski"}
    ]
    {username, position} = get_username_and_position(wallet)
    {proofs, beast_submissions_json} = get_proofs_and_submissions(wallet, 1, 5)

    conn
      |> assign(:wallet, wallet)
      |> assign(:game, %{
        image: "/images/parity.jpg",
        name: "Parity",
        desc: "Survive across waves of enemies",
        full_desc: "The object of this arcade-like game is to survive through a number of levels while crushing the beasts (├┤) with movable blocks (░░). The beasts are attracted to the player's (◄►) position every move. The beginning levels have only the common beasts, however in later levels the more challenging super-beasts appear (╟╢). These super-beasts are harder to kill as they must be crushed against a static block (▓▓).",
        acknowledgments: acknowledgements,
        tags: [:cli, :risc0, :sp1]
      })
      |> assign(:username, username)
      |> assign(:submitted_proofs, Jason.encode!(proofs))
      |> assign(:beast_submissions, beast_submissions_json)
      |> assign(:user_position, position)
      |> assign(:explorer_url, explorer_url)
      |> render(:parity_game)
  end

  def history(conn, _params) do
    wallet = get_wallet_from_session(conn)
    {proofs, beast_submissions_json} = get_proofs_and_submissions(wallet, 1, 10)

    {username, position} = get_username_and_position(wallet)

    explorer_url = Application.get_env(:zk_arcade, :explorer_url)
    batcher_url = Application.get_env(:zk_arcade, :batcher_url)

    conn
    |> assign(:wallet, wallet)
    |> assign(:network, Application.get_env(:zk_arcade, :network))
    |> assign(:proofs_sent_total, length(proofs))
    |> assign(:submitted_proofs, Jason.encode!(proofs))
    |> assign(:beast_submissions, beast_submissions_json)
    |> assign(:leaderboard_address, Application.get_env(:zk_arcade, :leaderboard_address))
    |> assign(:payment_service_address, Application.get_env(:zk_arcade, :payment_service_address))
    |> assign(:username, username)
    |> assign(:user_position, position)
    |> assign(:explorer_url, explorer_url)
    |> assign(:batcher_url, batcher_url)
    |> render(:history)
  end

  def leaderboard(conn, params) do
    wallet = get_wallet_from_session(conn)
    {proofs, beast_submissions_json} = get_proofs_and_submissions(wallet, 1, 10)

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
    |> assign(:beast_submissions, beast_submissions_json)
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

  def mint(conn, _params) do
    wallet_address = get_session(conn, :wallet_address)

    if wallet_address do
      # TODO: Check if the user has minted an NFT
      minted_nft = false

      {proofs, beast_submissions_json} = get_proofs_and_submissions(wallet_address, 1, 10)

      {username, position} = get_username_and_position(wallet_address)

      explorer_url = Application.get_env(:zk_arcade, :explorer_url)
      batcher_url = Application.get_env(:zk_arcade, :batcher_url)

      merkle_proof = case get_merkle_proof(wallet_address) do
        {:ok, proof} ->
          proof
        {:error, :proof_not_found} ->
          []
      end

      Logger.info("Merkle proof for address #{wallet_address}: #{inspect(merkle_proof)}")

      conn
      |> assign(:wallet, wallet_address)
      |> assign(:network, Application.get_env(:zk_arcade, :network))
      |> assign(:proofs_sent_total, length(proofs))
      |> assign(:submitted_proofs, Jason.encode!(proofs))
      |> assign(:beast_submissions, beast_submissions_json)
      |> assign(:leaderboard_address, Application.get_env(:zk_arcade, :leaderboard_address))
      |> assign(:payment_service_address, Application.get_env(:zk_arcade, :payment_service_address))
      |> assign(:username, username)
      |> assign(:user_position, position)
      |> assign(:explorer_url, explorer_url)
      |> assign(:batcher_url, batcher_url)
      |> assign(:minted_nft, minted_nft)
      |> assign(:merkle_proof, merkle_proof)
      |> render(:mint)
    else
      conn
      |> assign(:error, "No wallet connected")
      |> render(:home)
    end
  end

  defp get_merkle_proof(wallet_address) do
    file =
      :zk_arcade
      |> :code.priv_dir()
      |> to_string()
      |> Path.join("merkle/merkle-proofs.json")

    with {:ok, bin} <- File.read(file),
        {:ok, proofs} when is_list(proofs) <- Jason.decode(bin),
        norm <- String.downcase(wallet_address),
        %{"proof" => proof} <- Enum.find(proofs, fn %{"address" => a} ->
          String.downcase(a) == norm
        end) do
      {:ok, proof}
    else
      {:error, _} = err -> err
      _ -> {:error, :proof_not_found}
    end
  end
end
