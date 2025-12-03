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

  defp get_user_elegibility_public(nil) do
    "false"
  end

  defp get_user_elegibility_public(address) do
    case ZkArcade.PublicMerklePaths.get_merkle_proof_for_address(address) do
        {:ok, _proof, _index} -> "true"
        {:error, :proof_not_found} -> "false"
        _ -> "false"
    end
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

    current_beast_game = ZkArcade.BeastGames.get_current_beast_game()

    highest_level_reached_proof = current_beast_game && wallet &&
      ZkArcade.Proofs.get_highest_level_proof(wallet, "Beast", current_beast_game.game_config)

    conn
      |> assign(:submitted_proofs, Jason.encode!(proofs))
      |> assign(:wallet, wallet)
      |> assign(:eligible, eligible)
      |> assign(:game, %{
        image: "/images/beast.jpg",
        name: "Beast 1984",
        desc: "Survive across waves of enemies",
        full_desc: "The object of this arcade-like game is to survive through a number of levels while crushing the beasts (├┤) with movable blocks (░░). The beasts are attracted to the player's (◄►) position every move. The beginning levels have only the common beasts, however in later levels the more challenging super-beasts appear (╟╢). These super-beasts are harder to kill as they must be crushed against a static block (▓▓).",
        how_to_play: """
        1. Install Beast:
          - Windows: Download the portable executable:
          #{Application.get_env(:zk_arcade, :beast_windows_download_url)} or #{Application.get_env(:zk_arcade, :beast_windows_download_url_fallback)}
          - Linux/MacOS: Run the following command:
          <span class="code-block">curl -L #{Application.get_env(:zk_arcade, :beast_bash_download_url)} | bash</span> or <span class="code-block">curl -L #{Application.get_env(:zk_arcade, :beast_bash_download_url_fallback)} | bash</span>

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
      |> assign(:highest_level_reached_proof_id, if highest_level_reached_proof do to_string(highest_level_reached_proof.id) else nil end)
      |> render(:beast_game)
  end

  def game(conn, %{"name" => "parity"}) do
    wallet = get_wallet_from_session(conn)
    explorer_url = Application.get_env(:zk_arcade, :explorer_url)
    eligible = get_user_eligibility(wallet)
    discount_eligible = get_user_elegibility_public(wallet)
    acknowledgements = [
      %{text: "Original Parity game repository", link: "https://github.com/abejfehr/parity/"},
      %{text: "Original Parity game author", link: "https://github.com/abejfehr"}
    ]
    {username, position} = get_username_and_position(wallet)
    proofs = get_proofs(wallet, 1, 5)

    current_parity_game = ZkArcade.ParityGames.get_current_parity_game()

    highest_level_reached_proof = current_parity_game && wallet &&
      ZkArcade.Proofs.get_highest_level_proof(wallet, "Parity", current_parity_game.game_config)

    conn
      |> assign(:wallet, wallet)
      |> assign(:eligible, eligible)
      |> assign(:discount_eligible, discount_eligible)
      |> assign(:game, %{
        image: "/images/parity.jpg",
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
      |> assign(:highest_level_reached_proof_id, if highest_level_reached_proof do to_string(highest_level_reached_proof.id) else nil end)
      |> render(:parity_game)
  end

  def leaderboard(conn, params) do
    wallet = get_wallet_from_session(conn)
    eligible = get_user_eligibility(wallet)
    discount_eligible = get_user_elegibility_public(wallet)
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
    |> assign(:discount_eligible, discount_eligible)
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
    discount_eligible = get_user_elegibility_public(wallet)
    proofs = get_proofs(wallet, 1, 10)
    {username, position} = get_username_and_position(wallet)
    explorer_url = Application.get_env(:zk_arcade, :explorer_url)

    conn
    |> assign(:network, Application.get_env(:zk_arcade, :network))
    |> assign(:wallet, wallet)
    |> assign(:nft_contract_address, Application.get_env(:zk_arcade, :nft_contract_address))
    |> assign(:public_nft_contract_address, Application.get_env(:zk_arcade, :public_nft_contract_address))
    |> assign(:eligible, eligible)
    |> assign(:discount_eligible, discount_eligible)
    |> assign(:submitted_proofs, Jason.encode!(proofs))
    |> assign(:username, username)
    |> assign(:user_position, position)
    |> assign(:explorer_url, explorer_url)
    |> render(:mint)
  end
end
