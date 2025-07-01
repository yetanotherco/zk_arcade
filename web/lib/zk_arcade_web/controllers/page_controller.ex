defmodule ZkArcadeWeb.PageController do
  require Logger
  use ZkArcadeWeb, :controller

  def home(conn, _params) do
    render(conn, :home, layout: false)
  end

  def terms(conn, _params) do

    render(conn |> put_session(:step, 1), :terms_and_conditions, layout: false)
  end
end
