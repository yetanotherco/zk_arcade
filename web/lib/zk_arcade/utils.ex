defmodule ZkArcade.Utils do
  @url_regex ~r{(https?://[^\s\)]+)}

  def autolink_and_linebreak(text) do
    text
    |> String.replace(@url_regex, ~s(<a href="\\0" target="_blank" rel="noopener noreferrer">\\0</a>))
    |> String.replace("\n", "<br>")
  end

  def date_diff_days(unix_timestamp) do
    {:ok, start_datetime} = DateTime.from_unix(unix_timestamp)

    now = DateTime.utc_now()

    start_date = DateTime.to_date(start_datetime)
    current_date = DateTime.to_date(now)

    days_passed = Date.diff(current_date, start_date)

    days_passed
  end

  def cost_per_proof_type("groth16") do
    250000
  end

  def cost_per_proof_type("stark") do
    1000000
  end

  def cost_per_proof_type("sp1") do
    275000
  end

  def cost_per_proof_type("risc0") do
    308000
  end

  def calc_aligned_savings(proofs, proof_type, eth_price, gas_cost_gwei, proofs_per_batch \\ 20) do
    aligned_gas_per_batch = 350000 + 1800 * proofs_per_batch;
    gwei_price = eth_price * 0.000000001;

    base_cost_in_usd = cost_per_proof_type(proof_type) * gwei_price * gas_cost_gwei
    aligned_cost_in_usd = (aligned_gas_per_batch * gwei_price * gas_cost_gwei) / proofs_per_batch

    %{
      aligned_cost_in_usd: aligned_cost_in_usd,
      base_cost_in_usd: base_cost_in_usd,
      savings: (base_cost_in_usd - aligned_cost_in_usd) * proofs
    }
  end
end
