defmodule ZkArcadeWeb.WalletController do
  require Logger
  use ZkArcadeWeb, :controller
  alias ZkArcade.VerifySignature

  def connect_wallet(conn, %{"address" => address, "signature" => sig}) do
    conn = VerifySignature.call(conn, address, sig)

    if conn.assigns[:error] do
      conn = conn |> assign(:error, "Failure in signature authentication")
      render(conn, :home)
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
              |> assign(:error, "Hubo un problema al crear tu wallet")
              |> render(:home)
          end
      end
    end
  end

  def disconnect_wallet(conn, _params) do
     conn
    |> delete_session(:wallet_address)
    |> redirect(to: ~p"/")
  end
end
