defmodule ZkArcade.PrometheusMetrics do
  use Prometheus.Metric

  @counter [name: :failed_proofs_count, help: "Failed Proofs"]
  @counter [name: :users_registered_count, help: "Users Registered"]
  @gauge [name: :open_batcher_connections, help: "Active Batcher Connections"]
  @counter [name: :bumped_proofs_count, help: "Total Bumped Proofs"]

  def setup() do
    Counter.declare(name: :failed_proofs_count, help: "Failed Proofs")
    Counter.declare(name: :users_registered_count, help: "Users Registered")
    Gauge.declare(name: :open_batcher_connections, help: "Active Batcher Connections")
    Counter.declare(name: :bumped_proofs_count, help: "Total Bumped Proofs")
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
end
