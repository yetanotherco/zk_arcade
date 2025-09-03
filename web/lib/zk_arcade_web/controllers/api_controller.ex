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

  def get_nft_claim_merkle_proof(conn, %{"address" => address}) do
    merkle_proof = case get_merkle_proof(address) do
        {:ok, proof} ->
          proof
        {:error, :proof_not_found} ->
          []
      end

     case merkle_proof do
      {:ok, proof} ->
        conn |> json(%{merkle_proof: proof, tokenURI: ""})
      {:error, _} ->
         conn
          |> put_status(:internal_server_error)
          |> json(%{error: "Failed to fetch ETH price"})
    end
  end

  defp get_merkle_proof(wallet_address) do
    file =
      :zk_arcade
      |> :code.priv_dir()
      |> to_string()
      |> Path.join("merkle/merkle_proofs.json")

    with {:ok, bin} <- File.read(file),
        {:ok, proofs} when is_list(proofs) <- Jason.decode(bin),
        norm <- String.downcase(wallet_address),
        %{"proof" => proof} <- Enum.find(proofs, fn %{"address" => a} ->
          String.downcase(a) == norm
        end) do
      {:ok, proof}
    else
      {:error, _} = err -> err
      _ -> {:error, :proof_not_found}
    end
  end
end
