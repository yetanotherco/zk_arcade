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

          case ZkArcade.Accounts.create_wallet(%{address: String.downcase(address), agreement_signature: sig}) do
            {:ok, wallet} ->
              Logger.info("Created wallet for address #{wallet.address}")

            conn
            |> put_session(:wallet_address, wallet.address)
            |> redirect(to: ~p"/")
            {:error, changeset} ->
              Logger.error("Error creating wallet: #{inspect(changeset.errors)}")

              conn
              |> assign(:error, "There was a problem creating wallet: #{inspect(changeset.errors)}")
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

  def set_username(conn, %{"new_username" => username}) do
    Logger.info("Setting username to #{username}")
    wallet_address = get_session(conn, :wallet_address)

    if wallet_address do
      case ZkArcade.Accounts.set_wallet_username(wallet_address, username) do
        {:ok, _wallet} ->
          conn
          |> put_flash(:info, "Username updated successfully")
          |> redirect(to: ~p"/history")

        {:error, changeset} ->
          conn
          |> assign(:error, "Error updating username: #{inspect(changeset.errors)}")
          |> render(:history)
      end
    else
      conn
      |> assign(:error, "No wallet connected")
      |> render(:home)
    end
  end
end
