defmodule Mix.Tasks.SeedGames do
  @moduledoc """
  Mix task to seed game data from JSON files into the database.
  
  Usage:
    mix seed_games <beast_json_file> <parity_json_file>
    
  Example:
    mix seed_games games/beast/levels/leaderboard_mainnet.json games/parity/level_generator/levels/parity_mainnet.json
  """

  use Mix.Task
  alias ZkArcade.Repo
  alias ZkArcade.BeastGames.BeastGame
  alias ZkArcade.ParityGames.ParityGame

  @shortdoc "Seeds game data from JSON files"

  def run(args) do
    Mix.Task.run("app.start")

    case args do
      [beast_file, parity_file] ->
        clean_tables()
        seed_beast_games(beast_file)
        seed_parity_games(parity_file)
        Mix.shell().info("Game seeding completed!")

      _ ->
        Mix.shell().error("Usage: mix seed_games <beast_json_file> <parity_json_file>")
        Mix.shell().error("Example: mix seed_games games/beast/levels/leaderboard_mainnet.json games/parity/level_generator/levels/parity_mainnet.json")
    end
  end

  defp clean_tables() do
    Mix.shell().info("Cleaning existing game data...")
    
    Repo.delete_all(BeastGame)
    Repo.delete_all(ParityGame)
    
    Mix.shell().info("Tables cleaned successfully")
  end

  defp seed_beast_games(file_path) do
    Mix.shell().info("Seeding Beast games from #{file_path}")
    
    case File.read(file_path) do
      {:ok, content} ->
        case Jason.decode(content) do
          {:ok, %{"games" => games}} ->
            Enum.with_index(games, fn game, index ->
              attrs = %{
                game_index: index,
                starts_at: hex_to_datetime(game["startsAtTime"]),
                ends_at: hex_to_datetime(game["endsAtTime"]),
                game_config: game["gameConfig"]
              }

              %BeastGame{}
              |> BeastGame.changeset(attrs)
              |> Repo.insert()
              |> case do
                {:ok, _game} -> :ok
                {:error, changeset} ->
                  Mix.shell().error("Failed to insert Beast game: #{inspect(changeset.errors)}")
              end
            end)
            
            Mix.shell().info("Inserted #{length(games)} Beast games")

          {:error, error} ->
            Mix.shell().error("Failed to decode JSON from #{file_path}: #{inspect(error)}")
        end

      {:error, error} ->
        Mix.shell().error("Failed to read file #{file_path}: #{inspect(error)}")
    end
  end

  defp seed_parity_games(file_path) do
    Mix.shell().info("Seeding Parity games from #{file_path}")
    
    case File.read(file_path) do
      {:ok, content} ->
        case Jason.decode(content) do
          {:ok, %{"games" => games}} ->
            Enum.with_index(games, fn game, index ->
              attrs = %{
                game_index: index,
                starts_at: hex_to_datetime(game["startsAtTime"]),
                ends_at: hex_to_datetime(game["endsAtTime"]),
                game_config: game["gameConfig"]
              }

              %ParityGame{}
              |> ParityGame.changeset(attrs)
              |> Repo.insert()
              |> case do
                {:ok, _game} -> :ok
                {:error, changeset} ->
                  Mix.shell().error("Failed to insert Parity game: #{inspect(changeset.errors)}")
              end
            end)
            
            Mix.shell().info("Inserted #{length(games)} Parity games")

          {:error, error} ->
            Mix.shell().error("Failed to decode JSON from #{file_path}: #{inspect(error)}")
        end

      {:error, error} ->
        Mix.shell().error("Failed to read file #{file_path}: #{inspect(error)}")
    end
  end

  defp hex_to_datetime(hex_string) do
    # Remove "0x" prefix and convert hex to integer (Unix timestamp)
    timestamp = 
      hex_string
      |> String.replace_prefix("0x", "")
      |> String.to_integer(16)

    DateTime.from_unix!(timestamp)
  end
end
