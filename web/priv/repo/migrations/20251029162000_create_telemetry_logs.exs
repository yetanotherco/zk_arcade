defmodule ZkArcade.Repo.Migrations.CreateTelemetryLogs do
  use Ecto.Migration

  def change do
    create table(:telemetry_logs, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :name, :string, null: false
      add :message, :string, null: false
      add :address, :string, null: false
      add :details, :map

      timestamps()
    end
  end
end
