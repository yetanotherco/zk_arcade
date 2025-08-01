defmodule ZkArcade.EIP712Verifier do
  require Logger
  alias ExSecp256k1

  @domainType "EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"

  def verify_signature(signature, address, verification_data_hash, nonce, max_fee, chain_id) do
    with {:ok, domain_separator} <- build_domain_separator(chain_id),
         {:ok, struct_hash} <- build_struct_hash(verification_data_hash, nonce, max_fee),
         {:ok, typed_data_hash} <- build_typed_data_hash(domain_separator, struct_hash),
         {:ok, recovered_address} <- recover_address(signature, typed_data_hash) do
      if String.downcase(recovered_address) == String.downcase(address) do
        {:ok, true}
      else
        {:error, "Address mismatch: expected #{address}, got #{recovered_address}"}
      end
    else
      error -> error
    end
  end

  def build_domain_separator(chain_id) do
    verifying_contract_addr = Application.get_env(:zk_arcade, :payment_service_address)
    with {:ok, contract_address_bytes} <- decode_hex(verifying_contract_addr) do
      domain_type_hash = keccak256(@domainType)

      name_hash = keccak256("Aligned")
      version_hash = keccak256("1")
      chain_id_bytes = encode_uint256(chain_id)

      domain_separator = keccak256(
        domain_type_hash <>
        name_hash <>
        version_hash <>
        chain_id_bytes <>
        pad_address(contract_address_bytes)
      )

      {:ok, domain_separator}
    else
      {:error, reason} -> {:error, "Error building domain separator: #{inspect(reason)}"}
    end
  end

  def build_struct_hash(verification_data_hash, nonce, max_fee) do
    with {:ok, verification_data_hash_bytes} <- decode_hex(verification_data_hash) do
      type_hash = get_type_hash()

      nonce_bytes = encode_uint256(nonce)
      max_fee_bytes = encode_uint256(max_fee)

      struct_hash = keccak256(type_hash <> verification_data_hash_bytes <> nonce_bytes <> max_fee_bytes)
      {:ok, struct_hash}
    else
      {:error, reason} -> {:error, "Error building struct hash: #{inspect(reason)}"}
    end
  end

  def build_typed_data_hash(domain_separator, struct_hash) do
    typed_data_hash = keccak256(<<0x19, 0x01>> <> domain_separator <> struct_hash)
    {:ok, typed_data_hash}
  end

  def recover_address(%{"r" => r, "s" => s, "v" => v}, message_hash),
    do: recover_address(%{r: r, s: s, v: v}, message_hash)

  def recover_address(%{r: r, s: s, v: v}, message_hash) do
    with {:ok, r_bytes} <- decode_hex(r),
         {:ok, s_bytes} <- decode_hex(s),
         {:ok, recovery_id} <- normalize_v(v),
         {:ok, public_key} <- recover_public_key(message_hash, r_bytes, s_bytes, recovery_id),
         {:ok, address} <- public_key_to_address(public_key) do
      {:ok, "0x" <> Base.encode16(address, case: :lower)}
    else
      error -> error
    end
  end

  def verify_aligned_signature(signature_data, address, chain_id \\ 1) do
    %{
      "signature" => signature,
      "verificationData" => verification_data
    } = signature_data

    case ZkArcade.VerificationDataCommitment.compute_verification_data_commitment(verification_data["verificationData"]) do
      {:ok, verification_data_hash} ->
        verify_signature(
          signature,
          address,
          verification_data_hash.commitment,
          verification_data["nonce"],
          verification_data["maxFee"],
          chain_id
        )
      error -> error
    end
  end

  defp keccak256(data) do
    ExKeccak.hash_256(data)
  end

  # Used for convert an integer value to bytes
  defp encode_uint256(value) when is_integer(value) do
    <<value::big-unsigned-integer-size(256)>>
  end

  defp encode_uint256(value) when is_binary(value) do
    case decode_hex(value) do
      {:ok, bytes} ->
        int_value = :binary.decode_unsigned(bytes, :big)
        encode_uint256(int_value)
      {:error, _} ->
        case Integer.parse(value) do
          {int_value, ""} -> encode_uint256(int_value)
          _ -> raise "Invalid uint256 value: #{value}"
        end
    end
  end

  # Used for convert a string value representing an address to bytes
  defp decode_hex("0x" <> hex), do: decode_hex(hex)
  defp decode_hex(hex) when is_binary(hex) do
    case Base.decode16(hex, case: :mixed) do
      {:ok, bytes} -> {:ok, bytes}
      :error -> {:error, "Invalid hex string: #{hex}"}
    end
  end
  defp decode_hex(nil), do: {:error, "Cannot decode nil hex"}

  defp pad_address(address_bytes) when byte_size(address_bytes) == 20 do
    <<0::size(96)>> <> address_bytes
  end

  defp normalize_v(v) when is_integer(v) do
    cond do
      v in 27..28 -> {:ok, v - 27}
      v in 0..3 -> {:ok, v}
      true -> {:error, "Invalid v value: #{v}"}
    end
  end

  defp normalize_v(v) when is_binary(v) do
    case Integer.parse(v) do
      {int_v, ""} -> normalize_v(int_v)
      _ -> {:error, "Invalid v value: #{v}"}
    end
  end

  defp recover_public_key(message_hash, r, s, recovery_id) do
    try do
      signature = r <> s
      case ExSecp256k1.recover_compact(message_hash, signature, recovery_id) do
        {:ok, public_key} -> {:ok, public_key}
        {:error, reason} -> {:error, "Failed to recover public key: #{reason}"}
      end
    rescue
      e -> {:error, "Error in public key recovery: #{inspect(e)}"}
    end
  end

  defp public_key_to_address(public_key) do
    case public_key do
      <<0x04, key_bytes::binary-size(64)>> ->
        hash = keccak256(key_bytes)
        <<_::binary-size(12), address::binary-size(20)>> = hash
        {:ok, address}
      _ ->
        {:error, "Invalid public key format"}
    end
  end

  def get_type_hash do
    keccak256("NoncedVerificationData(bytes32 verification_data_hash,uint256 nonce,uint256 max_fee)")
  end
end
