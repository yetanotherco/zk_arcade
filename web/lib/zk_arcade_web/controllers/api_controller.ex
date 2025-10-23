defmodule ZkArcadeWeb.ApiController do
  use ZkArcadeWeb, :controller

  def check_agreement_status(conn, %{"address" => address}) do
    case ZkArcade.Accounts.fetch_wallet_by_address(String.downcase(address)) do
      {:ok, wallet} ->
        has_agreement = !is_nil(wallet.agreement_signature)

        # If wallet has agreement, automatically create session
        conn = if has_agreement do
          put_session(conn, :wallet_address, wallet.address)
        else
          conn
        end

        json(conn, %{
          exists: true,
          has_agreement: has_agreement,
          address: wallet.address,
          session_created: has_agreement
        })

      {:error, :not_found} ->
        json(conn, %{
          exists: false,
          has_agreement: false,
          address: String.downcase(address),
          session_created: false
        })
    end
  rescue
    _ ->
      conn
      |> put_status(:bad_request)
      |> json(%{error: "Invalid wallet address"})
  end

  def get_eth_price(conn, _) do
    eth_price = ZkArcade.EthPrice.get_eth_price_usd()

    case eth_price do
      {:ok, eth_price} ->
        conn |> json(%{eth_price: eth_price})
      {:error, _} ->
         conn
          |> put_status(:internal_server_error)
          |> json(%{error: "Failed to fetch ETH price"})
    end
  end

  def get_nft_eligibility(conn, %{"address" => address}) do
    case query_eligibility(address) do
      {:ok, eligible} ->
        conn |> json(%{eligible: eligible})
      {:error, _} ->
         conn
          |> put_status(:internal_server_error)
          |> json(%{error: "Failed to fetch eligibility"})
    end
  end

  defp query_eligibility(wallet_address) do
    case ZkArcade.MerklePaths.get_merkle_proof_for_address(wallet_address) do
      {:ok, _proof, _merkle_root_index} ->
        {:ok, true}

      {:error, :proof_not_found} ->
        {:ok, false}

      {:error, reason} ->
        {:error, reason}
    end
  end


  def get_nft_claim_merkle_proof(conn, %{"address" => address}) do
    case ZkArcade.MerklePaths.get_merkle_proof_for_address(address) do
      {:ok, proof, merkle_root_index} ->
        conn |> json(%{merkle_proof: proof, merkle_root_index: merkle_root_index})
      {:error, _} ->
         conn
          |> put_status(:internal_server_error)
          |> json(%{error: "Failed to fetch merkle proof"})
    end
  end

  def get_terms_message(conn, %{"address" => address}) do
    message = "Zk Arcade wants you to sign and accept the Terms of Service and Privacy Policy \n\nYour address: " <> address <> "\n\nClick to sign in and accept the Zk Arcade Terms of Service (https://zkarcade.com/tos) and Privacy Policy (https://zkarcade.com/privacy).\n"
    conn |> json(%{terms_message: message})
  end
end
