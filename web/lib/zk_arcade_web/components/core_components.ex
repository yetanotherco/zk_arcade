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
          <div class="bg-contrast-100 p-1 rounded flex justify-between items-center" style="width: 180px">
            <div>
              <p class="text-xs">Connected:</p>
              <p class="font-bold text-md">0x032...3211</p>
            </div>
            <.icon name="hero-chevron-down" class="size-3.5" />
          </div>
        </div>
      </nav>
    """
  end

  def line(assigns) do
    ~H"""
      <div class="w-full bg-accent-100" style="height: 1px"></div>
    """
  end

  def section_header(%{header: header} = assigns) do
    ~H"""
      <div class="mb-10 size-fit">
        <h2 class="mb-2 font-normal text-2xl size-fit" style="padding-right: 60px"><%= @header %></h2>
        <.line />
      </div>
    """
  end

  def home_game_component(%{title: title, desc: desc, img: img} = assigns) do
    ~H"""
    <div class="cursor-pointer group">
      <img class="rounded mb-5 w-full" src={@img} width={280} height={180} />
      <div>
        <h3 class="text-xl font-normal group-hover:underline underline-offset-4">
          <%= @title %>
        </h3>
        <p class="text-md text-text-200"><%= @desc %></p>
      </div>
    </div>
    """
  end

end
