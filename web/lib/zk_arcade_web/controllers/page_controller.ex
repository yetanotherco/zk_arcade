defmodule ZkArcadeWeb.PageController do
  require Logger
  use ZkArcadeWeb, :controller

  def home(conn, _params) do
    wallet =
      if address = get_session(conn, :wallet_address) do
        case ZkArcade.Accounts.fetch_wallet_by_address(address) do
          {:ok, wallet} -> wallet
          _ -> nil
        end
      else
        nil
      end

    proofs =
      case wallet do
        wallet -> ZkArcade.Proofs.get_proofs_by_address(address)
        _ -> nil
      end

    proofs_json = Enum.map(proofs, fn proof ->
      %{
        id: proof.id,
        wallet_address: proof.wallet_address,
        verification_data: proof.verification_data,
        inserted_at: proof.inserted_at,
        updated_at: proof.updated_at
      }
    end)

    conn
    |> assign(:proofs, proofs_json)
    |> assign(:wallet, wallet)
    |> render(:home, layout: false)
  end

  def disconnect_wallet(conn, _params) do
    conn
    |> delete_session(:wallet_address)
    |> redirect(to: ~p"/")
  end

  def terms(conn, _params) do

    render(conn |> put_session(:step, 1), :terms_and_conditions, layout: false)
  end
end
