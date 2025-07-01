defmodule ZkArcade.Repo do
  use Ecto.Repo,
    otp_app: :zk_arcade,
    adapter: Ecto.Adapters.Postgres
end
