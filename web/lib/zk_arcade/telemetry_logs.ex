defmodule ZkArcade.TelemetryLogs do
  @moduledoc """
  Context for persisting client telemetry logs.
  """

  alias ZkArcade.Repo
  alias ZkArcade.TelemetryLogs.TelemetryLog

  def create_log(attrs) do
    %TelemetryLog{}
    |> TelemetryLog.changeset(attrs)
    |> Repo.insert()
  end
end

