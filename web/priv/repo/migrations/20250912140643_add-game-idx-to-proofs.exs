defmodule :"Elixir.ZkArcade.Repo.Migrations.Add-game-idx-to-proofs" do
  use Ecto.Migration

  def change do
     alter table(:proofs) do
      add :game_idx, :integer
    end
  end
end
