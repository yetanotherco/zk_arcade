defmodule ZkArcadeWeb.PageController do
  # require Logger
  use ZkArcadeWeb, :controller

  def home(conn, _params) do
    render(conn, :home, layout: false)
  end

  def connect_wallet(conn, %{"address" => address}) do
    conn
    |> assign(:address, address)
    |> put_session(:step, 0)
    |> render(:home, layout: false)
  end

end
