defmodule ZkArcade.PrometheusMetrics do
  use Prometheus.Metric

  @counter [name: :failed_proofs_count, help: "Failed Proofs"]
  @counter [name: :users_registered_count, help: "Users Registered"]
  @gauge [name: :open_batcher_connections, help: "Active Batcher Connections"]
  @counter [name: :bumped_proofs_count, help: "Total Bumped Proofs"]
  @histogram [name: :time_to_verify_minutes, help: "Time for proof to be verified in minutes", buckets: [5, 10, 15, 20, 30, 45, 60, 90, 120, 180, 240, 300, 360, 420, 480]]

  def setup() do
    Counter.declare(name: :failed_proofs_count, help: "Failed Proofs")
    Counter.declare(name: :users_registered_count, help: "Users Registered")
    Gauge.declare(name: :open_batcher_connections, help: "Active Batcher Connections")
    Counter.declare(name: :bumped_proofs_count, help: "Total Bumped Proofs")
    Histogram.declare(name: :time_to_verify_minutes, help: "Time for proof to be verified in minutes", buckets: [5, 10, 15, 20, 30, 45, 60, 90, 120, 180, 240, 300, 360, 420, 480])
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

  def time_to_verify(minutes) when is_number(minutes) and minutes > 0 do
    Histogram.observe(name: :time_to_verify_minutes, value: minutes)
  end
end
