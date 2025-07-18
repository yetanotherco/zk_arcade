defmodule ZkArcade.VerifySignature do
  import Plug.Conn
  require Logger

  def init(opts), do: opts

  def call(conn, address, sig_hex) do
    message = "I agree with the service policy"
    prefixed = prefix_message(message)
    hash = ExKeccak.hash_256(prefixed)

    case recover_address(sig_hex, hash) do
      {:ok, recovered} ->
        if String.downcase(recovered) == String.downcase(address) do
          assign(conn, :signature_valid?, true)
        else
          reject(conn)
        end

      _ ->
        reject(conn)
    end
  end

  def call(conn, _), do: conn

  defp prefix_message(msg) do
    prefix = "\x19Ethereum Signed Message:\n" <> Integer.to_string(byte_size(msg))
    prefix <> msg
  end

  defp recover_address(sig_hex, msg_hash) do
    with {:ok, <<r::binary-size(32), s::binary-size(32), v_orig>>} <- decode_signature(sig_hex),
        v <- normalize_v(v_orig),
        {:ok, pubkey} <- ExSecp256k1.recover_compact(msg_hash, <<r::binary, s::binary>>, v),
        <<_::binary-size(1), rest::binary>> <- pubkey,
        hash <- ExKeccak.hash_256(rest),
        <<_::binary-size(12), address::binary>> <- hash
    do
      {:ok, "0x" <> Base.encode16(address, case: :lower)}
    else
      :invalid_v ->
        Logger.error("Invalid value for v")
        :error

      _ ->
        :error
    end
  end

  # Handle all the different v possible values
  defp normalize_v(27), do: 0
  defp normalize_v(28), do: 1
  defp normalize_v(0), do: 0
  defp normalize_v(1), do: 1
  defp normalize_v(_), do: :invalid_v

  defp decode_signature("0x" <> hex) do
    case Base.decode16(hex, case: :mixed) do
      {:ok, bin} when byte_size(bin) == 65 -> {:ok, bin}
      _ -> :error
    end
  end

  defp decode_signature(_), do: :error

  defp reject(conn) do
    conn
      |> assign(:error, "Failure in authentication")
      |> put_session(:step, 0)
  end

end
