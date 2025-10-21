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

  @impl true
  def mount(params, session, socket) do
    if connected?(socket) do
      Phoenix.PubSub.subscribe(ZkArcade.PubSub, "proof_claims")
    end

    wallet = get_wallet_from_session(session)

    entries_per_page = 5

    page = String.to_integer(params["page"] || "1")

    total_proofs = ZkArcade.Proofs.get_total_proofs_by_address(wallet)

    total_pages = ceil(total_proofs / entries_per_page)
    has_prev = page > 1
    has_next = page < total_pages

    {username, position} = get_username_and_position(wallet)
    proofs = if wallet, do: get_proofs(wallet, 1, 20), else: []

    eligible = get_user_eligibility(wallet)

    explorer_url = Application.get_env(:zk_arcade, :explorer_url)
    batcher_url = Application.get_env(:zk_arcade, :batcher_url)

    socket =
      socket
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

    {:ok, socket}
  end

  @impl true
  def handle_info({:proof_claimed, proof_data}, socket) do
    # Handle the PubSub event - refresh stats and show toast via push_event
    socket =
      socket
      |> push_event("show_toast", %{
        type: "success",
        message: "#{proof_data.username} just claimed a proof for level #{proof_data.level_reached} in #{proof_data.game}!"
      })
    {:noreply, socket}
  end

  @impl true
  def handle_params(_params, _url, socket) do
    {:noreply, socket}
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
