defmodule ZkArcadeWeb.PageController do
  require Logger
  use ZkArcadeWeb, :controller

  def home(conn, _params) do

    conn =
      if claim_time_expired?() do
        conn |> assign(:claim_time_expired, true)
      else
        {:ok, finish_time} =
          Application.get_env(:zk_arcade, :time_limit)
          |> String.to_integer()
          |> DateTime.from_unix()

        conn
        |> assign(:time_left, time_left())
        |> put_session(:step, 0)
        |> assign(:claim_time_expired, false)
        |> assign(:finish_time, finish_time)
      end

    render(conn, :home, layout: false)
  end

  def terms(conn, _params) do

    render(conn |> put_session(:step, 1), :terms_and_conditions, layout: false)
  end

  defp claim_time_expired? do
    current_timestamp = :os.system_time(:second)

    not (current_timestamp < Application.get_env(:zk_arcade, :time_limit) |> String.to_integer())
  end

  defp time_left() do
    current_timestamp = :os.system_time(:second)

    time =
      div(
        (Application.get_env(:zk_arcade, :time_limit) |> String.to_integer()) -
          current_timestamp,
        3600
      )

    %{days: div(time, 24), hours: rem(time, 24)}
  end

end
