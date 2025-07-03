defmodule ZkArcadeWeb.SignHTML do
  @moduledoc """
  This module contains pages rendered by SignController.

  See the `sign_html` directory for all templates available.
  """
  use ZkArcadeWeb, :html

  embed_templates "sign_html/*"
end
