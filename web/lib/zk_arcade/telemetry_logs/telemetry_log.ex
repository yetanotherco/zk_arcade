defmodule ZkArcade.TelemetryLogs.TelemetryLog do
  use Ecto.Schema
  import Ecto.Changeset
  alias ZkArcade.Repo

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id
  schema "telemetry_logs" do
    field :name, :string
    field :message, :string
    field :details, :map
    field :address, :string

    timestamps()
  end

  def changeset(log, attrs) do
    log
    |> cast(attrs, [:name, :message, :details, :address])
    |> validate_required([:name, :message, :address])
  end

  def list_logs() do
    ZkArcade.TelemetryLogs.TelemetryLog |> Repo.all()
  end
end
