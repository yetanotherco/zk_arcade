defmodule ZkArcadeWeb.PageHTML do
  @moduledoc """
  This module contains pages rendered by PageController.

  See the `html` directory for all templates available.
  """
  use ZkArcadeWeb, :html

  embed_templates "html/*"
end
