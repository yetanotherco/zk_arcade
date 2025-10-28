defmodule ZkArcadeWeb.HistoryLive.Index do
  use ZkArcadeWeb, :live_view

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

  defp build_redirect_url(_socket, message) do
    "/?message=" <> URI.encode(message)
  end

  @impl true
  def mount(params, session, socket) do
    if connected?(socket) do
      Phoenix.PubSub.subscribe(ZkArcade.PubSub, "proof_claims")
    end

    case get_wallet_from_session(session) do
      nil ->
        {:ok, redirect(socket, to: build_redirect_url(socket, "user-not-connected"))}
      wallet_address ->
        socket =
          socket
          |> assign_initial_data(session, params, wallet_address)
          |> assign_history_stats()

        {:ok, socket}
    end
  end

  @impl true
  def handle_info({:proof_claimed, proof_data}, socket) do
    # Handle the PubSub event - show toast via push_event

    # Note: Change here in case the points per level logic changes
    points_claimed = case proof_data.game do
      "Beast" -> proof_data.level_reached * 60000
      "Parity" -> proof_data.level_reached * 28000
    end

    socket =
      socket
      |> push_event("show_toast", %{
        type: "success",
        message: "<span class=\"font-bold\">#{proof_data.username}</span> just claimed <span class=\"font-bold\">#{points_claimed} points!</span>",
      })
    {:noreply, socket}
  end

  @impl true
  def handle_params(_params, _url, socket) do
    {:noreply, socket}
  end

  defp assign_initial_data(socket, _session, params, wallet) do
    {username, position} = get_username_and_position(wallet)
    eligible = get_user_eligibility(wallet)

    page = String.to_integer(params["page"] || "1")
    entries_per_page = 5

    explorer_url = Application.get_env(:zk_arcade, :explorer_url)
    batcher_url = Application.get_env(:zk_arcade, :batcher_url)

    socket
    |> assign(:wallet, wallet)
    |> assign(:eligible, eligible)
    |> assign(:network, Application.get_env(:zk_arcade, :network))
    |> assign(:leaderboard_address, Application.get_env(:zk_arcade, :leaderboard_address))
    |> assign(:nft_contract_address, Application.get_env(:zk_arcade, :nft_contract_address))
    |> assign(:payment_service_address, Application.get_env(:zk_arcade, :payment_service_address))
    |> assign(:username, username)
    |> assign(:user_position, position)
    |> assign(:explorer_url, explorer_url)
    |> assign(:batcher_url, batcher_url)
    |> assign(:current_page, page)
    |> assign(:entries_per_page, entries_per_page)
  end

  defp assign_history_stats(socket) do
    wallet = socket.assigns.wallet
    page = socket.assigns.current_page
    entries_per_page = socket.assigns.entries_per_page

    total_proofs = ZkArcade.Proofs.get_total_proofs_by_address(wallet)
    total_pages = ceil(total_proofs / entries_per_page)
    has_prev = page > 1
    has_next = page < total_pages

    proofs = if wallet, do: get_proofs(wallet, 1, 20), else: []

    socket
    |> assign(:proofs_sent_total, total_proofs)
    |> assign(:submitted_proofs, Jason.encode!(proofs))
    |> assign(:pagination, %{
      current_page: page,
      total_pages: total_pages,
      has_prev: has_prev,
      has_next: has_next,
      total_users: total_proofs,
      items_per_page: entries_per_page
    })
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
      position =
        case ZkArcade.Leaderboard.get_user_and_position(wallet) do
          %{position: position} -> position
          _ -> nil
        end
      {username, position}
    end
  end

  defp get_proofs(address, page, size) do
    ZkArcade.Proofs.get_proofs_by_address(address, %{page: page, page_size: size})
  end
end
