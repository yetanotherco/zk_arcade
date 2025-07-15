defmodule ZkArcadeWeb.SignController do
  require Logger
  use ZkArcadeWeb, :controller
  alias ZkArcade.VerifySignature

  plug :check_step
  @step 2

  def home(conn, _params) do
    render(conn, :home, layout: false)
  end

  def connect_wallet(conn, %{"address" => address, "signature" => sig}) do
    conn = VerifySignature.call(conn, address, sig)

    if conn.assigns[:error] do
      conn = conn |> assign(:error, "Failure in signature authentication")
      render(conn, :home, layout: false)
    else
      case ZkArcade.Accounts.fetch_wallet_by_address(String.downcase(address)) do
        {:ok, wallet} ->
          Logger.info("There is already a wallet for the received address")

          conn
          |> put_session(:wallet_address, wallet.address)
          |> redirect(to: ~p"/")

        {:error, :not_found} ->
          Logger.info("Could not find a wallet for the received address, creating wallet...")

          case ZkArcade.Accounts.create_wallet(%{address: String.downcase(address)}) do
            {:ok, wallet} ->
              Logger.info("Created wallet for address #{wallet.address}")

            conn
            |> put_session(:wallet_address, wallet.address)
            |> redirect(to: ~p"/")
            {:error, changeset} ->
              Logger.error("Error creating wallet: #{inspect(changeset.errors)}")

              conn
              |> assign(:error, "There was a problem creating wallet: #{inspect(changeset.errors)}")
              |> render(:home, layout: false)
          end
      end

      render(conn, :home, layout: false)
    end
  end

  defp check_step(conn, _) do
    case Plug.Conn.get_session(conn, :step) do
      step when step in [1, 2]->  conn |> put_session(:step, @step)
      _ -> conn |> halt() |> redirect(to: "/")
    end
  end
end
