defmodule ZkArcadeWeb.Router do
  use ZkArcadeWeb, :router

  pipeline :browser do
    plug :accepts, ["html"]
    plug :fetch_session
    plug :fetch_live_flash
    plug :put_root_layout, html: {ZkArcadeWeb.Layouts, :root}
    plug :protect_from_forgery
    plug :put_secure_browser_headers
  end

  scope "/", ZkArcadeWeb do
    pipe_through :browser

    get "/", PageController, :home
    get "/game/:name", PageController, :game
    post "/wallet/sign", WalletController, :connect_wallet
    get "/wallet/disconnect", WalletController, :disconnect_wallet

    post "/proof/", ProofController, :submit
    post "/proof/status/submitted", ProofController, :mark_proof_as_submitted_to_leaderboard
    post "/proof/status/retry", ProofController, :retry_submit_proof
    
    # API endpoint for wallet agreement status check
    get "/api/wallet/:address/agreement-status", WalletApiController, :check_agreement_status
  end

  # Enable LiveDashboard in development
  if Application.compile_env(:zk_arcade, :dev_routes) do
    # If you want to use the LiveDashboard in production, you should put
    # it behind authentication and allow only admins to access it.
    # If your application does not have an admins-only section yet,
    # you can use Plug.BasicAuth to set up some basic authentication
    # as long as you are also using SSL (which you should anyway).
    import Phoenix.LiveDashboard.Router

    scope "/dev" do
      pipe_through :browser

      live_dashboard "/dashboard", metrics: ZkArcadeWeb.Telemetry
    end
  end
end
