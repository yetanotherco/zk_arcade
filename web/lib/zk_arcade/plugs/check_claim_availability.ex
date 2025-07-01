defmodule ZkArcade.Plugs.CheckClaimAvailability do
  import Plug.Conn
  import Phoenix.Controller

  def init(opts \\ []), do: opts

  def call(conn, _opts) do

    if claim_time_expired?() do
      conn
      |> halt()
      |> redirect(to: "/")
    else
      conn
    end
  end

  defp claim_time_expired? do
    current_timestamp = :os.system_time(:second)

    not (current_timestamp <
      Application.get_env(:zk_arcade, :time_limit) |> String.to_integer())
  end
end
