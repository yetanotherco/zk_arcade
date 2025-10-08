defmodule ZkArcade.PrometheusMetrics do
  use Prometheus.Metric

  def setup() do
    Counter.declare(name: :failed_proofs_count, help: "Failed Proofs")
    Counter.declare(name: :users_registered_count, help: "Users Registered")
    Gauge.declare(name: :open_batcher_connections, help: "Active Batcher Connections")
    Counter.declare(name: :bumped_proofs_count, help: "Total Bumped Proofs")
    Counter.declare(
      name: :batcher_errors_total,
      help: "Batcher communication errors by type",
      labels: [:type]
    )
    Counter.declare(
      name: :proof_errors_total,
      help: "Proof pipeline errors by stage",
      labels: [:stage]
    )

    # Summary.declare(
    #   name: :time_to_verify_seconds,
    #   help: "Time to verify in seconds",
    #   duration_unit: false
    # )
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

  defp increment_with_label(counter_name, label) do
    Counter.inc(name: counter_name, labels: [normalize_label(label)])
  end

  defp normalize_label(label) when is_atom(label), do: Atom.to_string(label)
  defp normalize_label(label) when is_binary(label), do: label
  defp normalize_label(label), do: inspect(label)
  # def time_to_verify_seconds(seconds) when is_number(seconds) and seconds > 0 do
  #   Summary.observe(name: :time_to_verify_seconds, value: seconds)
  # end
end
