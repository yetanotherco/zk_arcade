defmodule ZkArcadeWeb.LeaderboardController do
  use ZkArcadeWeb, :controller

  @per_page 10

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

  def index(conn, params) do
    wallet = get_wallet_from_session(conn)
    proofs = get_proofs(wallet)

    page = String.to_integer(params["page"] || "1")
    offset = (page - 1) * @per_page

    top_users = ZkArcade.Leaderboard.get_top_users(@per_page, offset)

    total_users = ZkArcade.Leaderboard.get_total_users()
    total_pages = ceil(total_users / @per_page)
    has_prev = page > 1
    has_next = page < total_pages

    user_in_current_page? = Enum.any?(top_users, fn u -> u.address == wallet end)

    user_rank =
      if !user_in_current_page? && wallet do
        ZkArcade.Leaderboard.get_user_and_position(wallet)
      else
        nil
      end

    conn
    |> assign(:wallet, wallet)
    |> assign(:submitted_proofs, Jason.encode!(proofs))
    |> assign(:top_users, top_users)
    |> assign(:user_rank, user_rank)
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
