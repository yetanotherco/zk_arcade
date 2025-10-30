defmodule ZkArcadeWeb.Router do
  use ZkArcadeWeb, :router

  pipeline :browser do
    plug :accepts, ["html", "json"]
    plug :fetch_session
    plug :fetch_live_flash
    plug :put_root_layout, html: {ZkArcadeWeb.Layouts, :root}
    plug :protect_from_forgery
    plug :put_secure_browser_headers
  end

  scope "/", ZkArcadeWeb do
    pipe_through :browser

    live "/", HomeLive.Index, :index
    get "/games/", PageController, :games
    get "/games/:name", PageController, :game
    live "/history", HistoryLive.Index, :index
    get "/mint", PageController, :mint
    post "/wallet/sign", WalletController, :connect_wallet
    get "/wallet/disconnect", WalletController, :disconnect_wallet
    post "/wallet/username", WalletController, :set_username

    get "/leaderboard", PageController, :leaderboard

    get "/proof/verification-data", ProofController, :get_proof_verification_data
    get "/proof/pending", ProofController, :get_pending_proofs_to_bump
    get "/proof/stop-flag", ProofController, :get_stop_flag
    get "/proof/status/:proof_id", ProofController, :get_proof_status
    get "/proof/:proof_id", ProofController, :get_proof_submission
    post "/proof/", ProofController, :submit
    post "/proof/status/submitted", ProofController, :mark_proof_as_submitted_to_leaderboard
    post "/proof/status/retry", ProofController, :retry_submit_proof

    # API endpoint for wallet agreement status check
    get "/api/wallet/:address/agreement-status", ApiController, :check_agreement_status
    get "/api/wallet/terms-message", ApiController, :get_terms_message
    get "/api/wallet/:address/nfts", ApiController, :get_wallet_nfts
    get "/api/ethprice", ApiController, :get_eth_price
    get "/api/nft/proof", ApiController, :get_nft_claim_merkle_proof
    get "/api/nft/eligibility", ApiController, :get_nft_eligibility
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
