defmodule ZkArcadeWeb.CoreComponents do
  @moduledoc """
  Provides core UI components.

  At first glance, this module may seem daunting, but its goal is to provide
  core building blocks for your application, such as modals, tables, and
  forms. The components consist mostly of markup and are well-documented
  with doc strings and declarative assigns. You may customize and style
  them in any way you want, based on your application growth and needs.

  The default components use Tailwind CSS, a utility-first CSS framework.
  See the [Tailwind CSS documentation](https://tailwindcss.com) to learn
  how to customize them or feel free to swap in another framework altogether.

  Icons are provided by [heroicons](https://heroicons.com). See `icon/1` for usage.
  """
  use Phoenix.Component

  defp classes(list) when is_list(list) do
    list
    |> Enum.reject(&is_nil/1)
    |> Enum.join(" ")
  end

  def icon(%{name: "hero-" <> _} = assigns) do
    ~H"""
    <span class={classes([@name, @class])} />
    """
  end

  def nav(assigns) do
    ~H"""
      <nav class="w-full flex justify-between items-center">
        <div>
          <h1 class="text-xl">
            ZK Arcade
          </h1>
          <p class="tex-md text-accent-100">
            Powered by ALIGNED
          </p>
        </div>

        <div>
          <%!-- TODO: react component here --%>
          <div class="bg-contrast-100 p-1 rounded flex justify-between items-center" style="width: 200px">
            <div>
              <p class="text-xs">Connected:</p>
              <p class="font-bold text-md">0x032...3211</p>
            </div>
            <.icon name="hero-chevron-down" class="size-3;5" />
          </div>
        </div>
      </nav>
    """
  end

end
