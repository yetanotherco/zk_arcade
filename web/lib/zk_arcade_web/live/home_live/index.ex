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
        question: "Why do I need a wallet to play?",
        answer: "Your wallet is your identity in ZK Arcade. It allows you to deposit ETH into Aligned to pay for proof verification, claim your points on the leaderboard, and keep all your progress securely tied to your address."
      },
      %{
        number: "02",
        question: "Why do I need to mint an NFT?",
        answer: "The NFT proves you're eligible to participate. It acts as your entry ticket to ZK Arcade and helps us maintain fair play by ensuring each participant is verified."
      },
      %{
        number: "03",
        question: "How much does it cost to play?",
        answer: "Playing costs only the gas fees for transactions on Aligned Network. Proof verification is extremely affordable - typically just a few cents per proof."
      },
      %{
        number: "04",
        question: "What games can I play?",
        answer: "Currently, we offer Parity (a number guessing game) and Beast (a simple platformer). More games are coming soon!"
      },
      %{
        number: "05",
        question: "Can I transfer or sell the NFT?",
        answer: "No. The NFT is non-transferable. It's permanently tied to the wallet that minted it to preserve fair participation and prevent selling or lending access."
      },
      %{
        number: "06",
        question: "Why do I need to verify my proofs?",
        answer: "Verification guarantees that your results are valid and are not tampered with. It ensures the leaderboard reflects the player's real skills, and not manipulated outcomes."
      },
      %{
        number: "07",
        question: "Can I resubmit a proof for a lower level?",
        answer: "No, you can only submit proofs for higher levels than your current best. This maintains competitive integrity and prevents gaming the system."
      },
      %{
        number: "08",
        question: "How long does proof verification take?",
        answer: "Proof verification on Aligned Network typically takes just a few seconds to a few minutes, depending on network congestion."
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
