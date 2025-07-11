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

    conn
    |> assign(:wallet, wallet)
    |> render(:home)
  end

  def disconnect_wallet(conn, _params) do
    conn
    |> delete_session(:wallet_address)
    |> redirect(to: ~p"/")
  end

  def game(conn, %{"name" => game_name}) do
     conn
      |> assign(:game, game_name)
      |> render(:game)
  end
end
