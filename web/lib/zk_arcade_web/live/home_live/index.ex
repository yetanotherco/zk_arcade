defmodule ZkArcadeWeb.HomeLive.Index do
  use ZkArcadeWeb, :live_view
  require Logger

  @impl true
  def mount(_params, session, socket) do
    if connected?(socket) do
      Phoenix.PubSub.subscribe(ZkArcade.PubSub, "proof_claims")
    end

    socket =
      socket
      |> assign_initial_data(session)
      |> assign_home_stats()

    {:ok, socket}
  end

  @impl true
  def handle_info({:proof_claimed, proof_data}, socket) do
    # Handle the PubSub event - refresh stats and show toast via push_event

    # Note: Change here in case the points per level logic changes
    points_claimed = case proof_data.game do
      "Beast" -> proof_data.level_reached * 60000
      "Parity" -> proof_data.level_reached * 28000
    end

    socket =
      socket
      |> assign_home_stats()
      |> push_event("show_toast", %{
        message: "<span class=\"font-bold\">#{proof_data.username}</span> just claimed <span class=\"font-bold\">#{points_claimed} points!</span>",
        type: "info"
      })

    {:noreply, socket}
  end

  @impl true
  def handle_info(:clear_flash, socket) do
    {:noreply, socket}
  end

  @impl true
  def handle_params(_params, _url, socket) do
    {:noreply, socket}
  end

  def utc_hex_to_date(%DateTime{} = dt) do
    dt |> DateTime.to_date() |> Date.to_string()
  end

  def is_current_game(gameStart, gameEnd) do
    seconds_start = DateTime.to_unix(gameStart, :second)
    seconds_end = DateTime.to_unix(gameEnd, :second)

    # Reduce 2 days (48 hours) for end date (so we don't count the extra claim period)
    seconds_end = seconds_end - (86400 * 2)

    # Get current utc seconds
    current_time_utc = DateTime.utc_now() |> DateTime.to_unix(:second)

    current_time_utc >= seconds_start and current_time_utc <= seconds_end
  end

  defp get_upcoming_games() do
    current_games = ZkArcade.BeastGames.get_current_and_future_games()

    current_games
    |> Enum.with_index()
    |> Enum.map(fn {game, index} ->
      # For all games except the last one, use the next game's start time as end time
      end_time = if index < length(current_games) - 1 do
        next_game = Enum.at(current_games, index + 1)
        utc_hex_to_date(next_game.starts_at)
      else
        utc_hex_to_date(game.ends_at)
      end

      %{
        round: game.game_index + 1, # Because indexing starts at zero
        start_time: utc_hex_to_date(game.starts_at),
        end_time: end_time,
        is_current: is_current_game(game.starts_at, game.ends_at)
      }
    end)
  end

  defp assign_initial_data(socket, session) do
    wallet = get_wallet_from_session(session)
    {username, position} = get_username_and_position(wallet)

    upcoming_games = get_upcoming_games()

    socket
    |> assign(:wallet, wallet)
    |> assign(:username, username)
    |> assign(:user_position, position)
    |> assign(:network, Application.get_env(:zk_arcade, :network))
    |> assign(:payment_service_address, Application.get_env(:zk_arcade, :payment_service_address))
    |> assign(:leaderboard_address, Application.get_env(:zk_arcade, :leaderboard_address))
    |> assign(:nft_contract_address, Application.get_env(:zk_arcade, :nft_contract_address))
    |> assign(:batcher_url, Application.get_env(:zk_arcade, :batcher_url))
    |> assign(:explorer_url, Application.get_env(:zk_arcade, :explorer_url))
    |> assign(:notifications, [])
    |> assign(:upcoming_games, upcoming_games)
    |> assign(:eligible, get_user_eligibility(wallet))
  end

  defp assign_home_stats(socket) do
    leaderboard = ZkArcade.LeaderboardContract.top10()
    wallet = socket.assigns.wallet
    proofs = get_proofs(wallet, 1, 5)
    proofs_verified = ZkArcade.Proofs.get_verified_proofs_count()
    nfts_minted = ZkArcade.Accounts.get_total_nfts_minted()

    campaign_started_at_unix_timestamp = Application.get_env(:zk_arcade, :campaign_started_at)
    days = ZkArcade.Utils.date_diff_days(String.to_integer(campaign_started_at_unix_timestamp))
    desc = "Last #{days} days"
    total_claimed_points = ZkArcade.Leaderboard.count_total_claimed_points()

    top_users = ZkArcade.Leaderboard.get_top_users(10)
    user_in_top? = Enum.any?(top_users, fn u -> u.address == wallet end)

    user_data = if !user_in_top? && wallet do
      case ZkArcade.Leaderboard.get_user_and_position(wallet) do
        %{user: user, position: position} ->
          %{address: wallet, position: position, score: user.score, username: socket.assigns.username}
        _ -> nil
      end
    else
      nil
    end

    faqs = [
      %{
        number: "01",
        question: "How can I play ZK Arcade?",
        answer: "Access to ZK Arcade is gated by the ZK Arcade Ticket NFT. You must mint the NFT on the Zk Arcade website to play. Connect your wallet to check eligibility, mint the NFT, deposit ETH to pay for proof verification, and start playing!"
      },
      %{
        number: "02",
        question: "How can I obtain an NFT ticket to play ZK Arcade?",
        answer: "If you have been whitelisted, you can mint your NFT on the ZK Arcade website. If you aren't eligible, follow our official channels (<a href=\"https://x.com/alignedlayer\" target=\"_blank\" class=\"underline\">X</a>, <a href=\"https://blog.alignedlayer.com/\" target=\"_blank\" class=\"underline\">blog</a>, <a href=\"https://t.me/alignedlayer\" target=\"_blank\" class=\"underline\">telegram channel</a>), and <a href=\"https://discord.gg/alignedlayer\" target=\"_blank\" class=\"underline\">join our Discord community</a> to stay updated on when the next wave of access becomes available."
      },
      %{
        number: "03",
        question: "How much does NFT minting cost?",
        answer: "The ZK Arcade Ticket NFT is free. You only have to pay gas for the minting transaction."
      },
      %{
        number: "04",
        question: "How much does it cost to play each game?",
        answer: "Playing games on ZK Arcade is free! However, you have to deposit some ETH into Aligned (recommended 0.001 ETH) to submit proofs for verification. You will also need to pay a small separate gas fee for the transaction to claim points on the leaderboard (around $1, and you can set a lower priority fee in your wallet to save gas)."
      },
      %{
        number: "05",
        question: "How often are new challenges released?",
        answer: "New challenges are released every Monday and Friday at 00:00 UTC. You have an additional 48-hour window to claim points after a level expires."
      },
      %{
        number: "06",
        question: "What can I do if my claim fails?",
        answer: "If your claim fails, or you see an unusually high estimated fee on your wallet, use the <span class=\"underline\">Reset</span> action in the claim modal. This will discard the previously generated proof so you can play again and start over."
      },
      %{
        number: "07",
        question: "Where can I contact you?",
        answer: "You can reach us on our official channels: <a href=\"https://x.com/alignedlayer\" target=\"_blank\" class=\"underline\">X</a>, <a href=\"https://discord.gg/alignedlayer\" target=\"_blank\" class=\"underline\">Discord</a>, <a href=\"https://t.me/alignedlayer\" target=\"_blank\" class=\"underline\">Telegram</a>, and our <a href=\"https://blog.alignedlayer.com/\" target=\"_blank\" class=\"underline\">blog</a>."
      }
    ]

    socket
    |> assign(:leaderboard, leaderboard)
    |> assign(:submitted_proofs, Jason.encode!(proofs))
    |> assign(:desc, desc)
    |> assign(:top_users, top_users)
    |> assign(:total_claimed_points, ZkArcade.NumberDisplay.convert_number_to_shorthand(trunc(total_claimed_points)))
    |> assign(:proofs_verified, proofs_verified)
    |> assign(:nfts_minted, nfts_minted)
    |> assign(:user_data, user_data)
    |> assign(:faqs, faqs)
  end

  defp get_wallet_from_session(session) do
    if address = session["wallet_address"] do
      case ZkArcade.Accounts.fetch_wallet_by_address(address) do
        {:ok, wallet} -> wallet.address
        _ -> nil
      end
    else
      nil
    end
  end

  defp get_username_and_position(wallet) do
    if !wallet do
      {nil, nil}
    else
      username = ZkArcade.Accounts.get_wallet_username(wallet)
      position = case ZkArcade.Leaderboard.get_user_and_position(wallet) do
        %{position: position} -> position
        _ -> nil
      end
      {username, position}
    end
  end

  defp get_proofs(address, page, size) do
    if address do
      ZkArcade.Proofs.get_proofs_by_address(address, %{page: page, page_size: size})
    else
      []
    end
  end

  defp get_user_eligibility(nil), do: "false"
  defp get_user_eligibility(address) do
    case ZkArcade.MerklePaths.get_merkle_proof_for_address(address) do
      {:ok, _proof, _index} -> "true"
      {:error, :proof_not_found} -> "false"
      _ -> "false"
    end
  end
end
