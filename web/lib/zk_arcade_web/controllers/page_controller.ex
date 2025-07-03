defmodule ZkArcadeWeb.PageController do
  require Logger
  use ZkArcadeWeb, :controller

  def home(conn, _params) do
    wallet =
      if address = get_session(conn, :wallet_address) do
        ZkArcade.Accounts.fetch_wallet_by_address(address) |> elem(1)
      else
        nil
      end

    conn
    |> assign(:wallet, wallet)
    |> render(:home, layout: false)
  end

  def terms(conn, _params) do

    render(conn |> put_session(:step, 1), :terms_and_conditions, layout: false)
  end
end
