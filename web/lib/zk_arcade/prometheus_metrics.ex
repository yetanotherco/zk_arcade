defmodule ZkArcade.PrometheusMetrics do
  use Prometheus.Metric

  @counter [name: :failed_proofs_count, help: "Failed Proofs"]
  @counter [name: :users_registered_count, help: "Users Registered"]

  def setup() do
    Counter.declare(name: :failed_proofs_count, help: "Failed Proofs")
    Counter.declare(name: :users_registered_count, help: "Users Registered")
  end

  def failed_proof() do
    Counter.inc(name: :failed_proofs_count)
  end

  def user_registered() do
    Counter.inc(name: :users_registered_count)
  end

end
