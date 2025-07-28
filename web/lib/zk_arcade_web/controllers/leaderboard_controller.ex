defmodule ZkArcadeWeb.LeaderboardController do
  use ZkArcadeWeb, :controller

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

  def index(conn, _params) do
    wallet = get_wallet_from_session(conn)
    proofs = get_proofs(wallet)

    conn
    |> assign(:wallet, wallet)
    |> assign(:submitted_proofs, Jason.encode!(proofs))
    |> render(:leaderboard)
  end
end
