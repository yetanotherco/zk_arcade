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
    points_claimed = proof_data.level_reached

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

  defp assign_initial_data(socket, session) do
    wallet = get_wallet_from_session(session)
    {username, position} = get_username_and_position(wallet)

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
    |> assign(:eligible, get_user_eligibility(wallet))
  end

  defp assign_home_stats(socket) do
    leaderboard = ZkArcade.LeaderboardContract.top10()
    wallet = socket.assigns.wallet
    proofs = get_proofs(wallet, 1, 5)
    proofs_verified = ZkArcade.Proofs.list_proofs()
    total_players = ZkArcade.Accounts.list_wallets()

    eth_price = case ZkArcade.EthPrice.get_eth_price_usd() do
      {:ok, price} -> price
      {:error, reason} ->
        Logger.error("Failed to get ETH price: #{reason}")
        0
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

    avg_savings_per_proof = if proofs_verified > 0 do
      div(trunc(cost_saved.savings), proofs_verified)
    else
      0
    end

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
        answer: "To play ZK Arcade, you first need to mint your NFT ticket, in case you are whitelisted. Once you have the ticket, connect your wallet and choose an available game to play."
      },
      %{
        number: "02",
        question: "How can I obtain an NFT ticket to play ZK Arcade?",
        answer: "You can obtain your NFT ticket by minting it on the page if you are whitelisted. If you aren't whitelisted, follow our official channels (X and our Blog), and join the Discord community to stay updated for future minting rounds."
      },
      %{
        number: "03",
        question: "How much does NFT minting cost?",
        answer: "The cost of minting an NFT ticket for ZK Arcade varies depending on current gas fees and the specific minting event."
      },
      %{
        number: "04",
        question: "How much does it cost to play each game?",
        answer: "Playing games on ZK Arcade is free. However, to claim points on the leaderboard you will need to pay a small gas fee for the claim transaction."
      },
      %{
        number: "05",
        question: "How often are new challenges released?",
        answer: "Two challenges are released per week,  every Monday and Friday at 12:00 PM UTC."
      }
    ]

    socket
    |> assign(:leaderboard, leaderboard)
    |> assign(:submitted_proofs, Jason.encode!(proofs))
    |> assign(:proofs_verified, proofs_verified)
    |> assign(:total_players, total_players)
    |> assign(:cost_saved, ZkArcade.NumberDisplay.convert_number_to_shorthand(trunc(cost_saved.savings)))
    |> assign(:desc, desc)
    |> assign(:total_claimed_points, total_claimed_points)
    |> assign(:proofs_per_player, proofs_per_player)
    |> assign(:avg_savings_per_proof, avg_savings_per_proof)
    |> assign(:top_users, top_users)
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
