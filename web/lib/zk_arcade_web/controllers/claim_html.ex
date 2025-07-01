defmodule ZkArcadeWeb.ClaimHTML do
  @moduledoc """
  This module contains pages rendered by ClaimController.

  See the `claim_html` directory for all templates available.
  """
  use ZkArcadeWeb, :html

  embed_templates "claim_html/*"
end
