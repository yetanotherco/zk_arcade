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
          <.link href="/">
            <h1 class="text-xl">
              ZK Arcade
            </h1>
            <p class="tex-md text-accent-100">
              Powered by ALIGNED
            </p>
          </.link>

        <div>
          <x-app-user-wallet
            network={@network}
            payment_service_address={@payment_service_address}
            user_address={@wallet}
            proofs={@submitted_proofs}
            leaderboard_address={@leaderboard_address}
          />
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

  def home_game_component(%{title: title, desc: desc, img: img, link: link, tags: tags, disabled: disabled} = assigns) do
    ~H"""
    <%= if @disabled == "true" do %>
      <div class="w-full sm:max-w-280">
        <.game_content tags={@tags} title={@title} desc={@desc} img={@img} />
      </div>
    <% else %>
      <.link href={@link}>
        <div class="cursor-pointer group w-full sm:max-w-280">
          <.game_content tags={@tags} title={@title} desc={@desc} img={@img} />
        </div>
      </.link>
    <% end %>
    """
  end

  defp game_content(assigns) do
    ~H"""
    <img class="rounded mb-1 w-full" src={@img} width={280} height={180} />
    <div>
        <h3 class="text-xl font-normal group-hover:underline underline-offset-4">
          <%= @title %>
        </h3>
      <div class="flex mb-2 gap-2">
        <%= for variant <- @tags do %>
          <.tag variant={variant} />
        <% end %>
      </div>
      <p class="text-md text-text-200"><%= @desc %></p>
    </div>
    """
  end

  def tag(assigns) do
    ~H"""
    <%= case @variant do %>
      <% :risc0 -> %>
        <p class="mt-2 text-xs text-text-100 bg-risc0/20 border border-risc0 rounded w-fit px-3 font-bold">Risc0</p>
      <% :cli -> %>
        <p class="mt-2 text-xs text-text-100 bg-orange/20 border border-orange rounded w-fit px-3 font-bold">CLI</p>
      <% :browser -> %>
        <p class="mt-2 text-xs text-text-100 bg-blue/20 border border-blue rounded w-fit px-3 font-bold">Browser</p>
      <% :circom -> %>
        <p class="mt-2 text-xs text-text-100 bg-circom/20 border border-circom rounded w-fit px-3 font-bold">Circom</p>
      <% _ -> %>
    <% end %>
    """
  end


  @doc ~S"""
  Renders a table with custom styling.

  ## Examples

      <.table id="users" rows={@users}>
        <:col :let={user} label="id"><%= user.id %></:col>
        <:col :let={user} label="username"><%= user.username %></:col>
      </.table>
  """
  attr(:id, :string, required: true)
  attr(:class, :any, default: nil, doc: "css class attributes for the card background")
  attr(:rows, :list, required: true)
  attr(:row_id, :any, default: nil, doc: "the function for generating the row id")
  attr(:row_item, :any,
    default: &Function.identity/1,
    doc: "the function for mapping each row before calling the :col and :action slots"
  )
  slot :col, required: true do
    attr(:label, :string)
    attr(:class, :string)
  end

  slot(:action, doc: "the slot for showing user actions in the last table column")
  def table(assigns) do
    ~H"""
    <table class="table-fixed border-collapse w-full">
      <thead>
        <tr class="text-text-200 truncate">
          <th :for={{col, _i} <- Enum.with_index(@col)} class="text-left font-normal pb-5">
          <%= col[:label] %>
          </th>
        </tr>
      </thead>
      <tbody id={@id}>
        <tr
          :for={row <- @rows}
          id={@row_id && @row_id.(row)}
          class="gap-y-2 [&>td]:pb-4 animate-in fade-in-0 duration-700 truncate"
        >
          <td
            :for={{col, _i} <- Enum.with_index(@col)}
            class={classes(["p-0 pr-10"])}
          >
            <div class={
              classes([
                "group block normal-case  text-base min-w-28"
              ])
            }>
              <%= render_slot(col, @row_item.(row)) %>
            </div>
          </td>
          <td :if={@action != []} class="w-14 p-0">
            <div class="whitespace-nowrap py-4 text-left text-sm">
              <span :for={action <- @action} class="ml-4 leading-6 text-muted-foreground">
                <%= render_slot(action, @row_item.(row)) %>
              </span>
            </div>
          </td>
        </tr>
      </tbody>
    </table>
    """
  end

  def footer(assigns) do
    ~H"""
    <div class="w-full border-t border-text-200/20 backdrop-blur-lg backdrop-saturate-200">
      <div
        class="w-full flex justify-center items-center flex-wrap p-5 py-10 gap-5 m-auto"
        style="max-width: 1000px;"
      >
        <div class="hidden sm:inline-block flex-1">
          <p class="text-md">
            Powered By
            <span class="text-accent-100 block mt-1">
              Aligned Layer
            </span>
          </p>
        </div>

        <div class="h-full">
          <div class="flex-1 flex flex-wrap gap-10 md:gap-32">
            <%= for {title, links} <- @headers do %>
              <div class="flex flex-col items-start gap-2">
                <h3 class="text-text-100 font-bold text-lg"><%= title %></h3>
                <%= for {value, link} <- links do %>
                  <.link class="text-sm text-text-200 hover:underline" href={link}>
                    <%= value %>
                  </.link>
                <% end %>
              </div>
            <% end %>
          </div>
        </div>
      </div>
    </div>
    """
  end
end
