defmodule ZkArcade.Application do
  # See https://hexdocs.pm/elixir/Application.html
  # for more information on OTP Applications
  @moduledoc false

  use Application

  @impl true
  def start(_type, _args) do
    children = [
      ZkArcadeWeb.Telemetry,
      {Cachex, name: :eth_price_cache},
      ZkArcade.Repo,
      {DNSCluster, query: Application.get_env(:zk_arcade, :dns_cluster_query) || :ignore},
      {Phoenix.PubSub, name: ZkArcade.PubSub},
      {Registry, keys: :unique, name: ZkArcade.ProofRegistry},
      {Task.Supervisor, name: ZkArcade.TaskSupervisor},
      ZkArcade.SubmissionPoller,
      # Start a worker by calling: ZkArcade.Worker.start_link(arg)
      # {ZkArcade.Worker, arg},
      # Start to serve requests, typically the last entry
      ZkArcadeWeb.Endpoint
    ]

    # See https://hexdocs.pm/elixir/Supervisor.html
    # for other strategies and supported options
    opts = [strategy: :one_for_one, name: ZkArcade.Supervisor]
    Supervisor.start_link(children, opts)
  end

  # Tell Phoenix to update the endpoint configuration
  # whenever the application is updated.
  @impl true
  def config_change(changed, _new, removed) do
    ZkArcadeWeb.Endpoint.config_change(changed, removed)
    :ok
  end
end
