defmodule ZkArcadeWeb.HistoryController do
  use ZkArcadeWeb, :controller

  def history(conn, _params) do
    render(conn, :history)
  end

end
