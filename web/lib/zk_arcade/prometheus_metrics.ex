defmodule ZkArcade.PrometheusMetrics do
  use Prometheus.Metric
  alias ZkArcade.{BeastGames, ParityGames}

  def setup() do
    Counter.declare(name: :failed_proofs_count, help: "Failed Proofs")
    Counter.declare(name: :claims, help: "Gets incremented after every claim event")
    Counter.declare(name: :nft_mints, help: "Gets incremented after every nft mint event")
    Counter.declare(name: :public_nft_mints_without_discount, help: "Gets incremented after every public nft mint event without discount")
    Counter.declare(name: :public_nft_mints_with_discount, help: "Gets incremented after every public nft mint event with discount")
    Counter.declare(name: :users_registered_count, help: "Users Registered")
    Gauge.declare(name: :open_batcher_connections, help: "Active Batcher Connections")
    Counter.declare(name: :bumped_proofs_count, help: "Total Bumped Proofs")
    Counter.declare(
      name: :user_errors_total,
      help: "User errors by type",
      labels: [:type]
    )
    Gauge.declare(
      name: :game_claims_by_index,
      help: "Game claims by game type and index",
      labels: [:game_type, :game_index]
    )

    # Summary.declare(
    #   name: :time_to_verify_seconds,
    #   help: "Time to verify in seconds",
    #   duration_unit: false
    # )
  end

  def increment_claims() do
    Counter.inc(name: :claims)
  end

  def increment_nft_mints() do
    Counter.inc(name: :nft_mints)
  end

  def increment_public_nft_mints_without_discount() do
    Counter.inc(name: :public_nft_mints_without_discount)
  end

  def increment_public_nft_mints_with_discount() do
    Counter.inc(name: :public_nft_mints_with_discount)
  end

  def failed_proof() do
    Counter.inc(name: :failed_proofs_count)
  end

  def user_registered() do
    Counter.inc(name: :users_registered_count)
  end

  def add_open_batcher_connection() do
    Gauge.inc(name: :open_batcher_connections)
  end

  def remove_open_batcher_connection() do
    Gauge.dec(name: :open_batcher_connections)
  end

  def bumped_proof() do
    Counter.inc(name: :bumped_proofs_count)
  end

  def record_user_error(type) do
    increment_with_label(:user_errors_total, type)
  end

  def record_game_claim(game_type, game_index) do
    Gauge.inc([name: :game_claims_by_index, labels: [normalize_label(game_type), normalize_label(game_index)]])
  end

  defp increment_with_label(counter_name, label) do
    Counter.inc([name: counter_name, labels: [normalize_label(label)]])
  end

  defp normalize_label(label) when is_atom(label), do: Atom.to_string(label)
  defp normalize_label(label) when is_binary(label), do: label
  defp normalize_label(label), do: inspect(label)
  # def time_to_verify_seconds(seconds) when is_number(seconds) and seconds > 0 do
  #   Summary.observe(name: :time_to_verify_seconds, value: seconds)
  # end

  def initialize_game_counters do
    beast_count = BeastGames.get_game_indices_count()
    parity_count = ParityGames.get_game_indices_count()

    # Initialize Beast game counters
    for index <- 0..(beast_count - 1) do
      Gauge.set([name: :game_claims_by_index, labels: ["Beast", "#{index}"]], 0)
    end

    # Initialize Parity game counters
    for index <- 0..(parity_count - 1) do
      Gauge.set([name: :game_claims_by_index, labels: ["Parity", "#{index}"]], 0)
    end
  end
end
