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
    assigns =
      assigns
      |> Map.put_new(:class, "")
      |> Map.put_new(:style, style_from_color(assigns))

    ~H"""
    <span class={classes([@name, @class])} style={@style} />
    """
  end

  defp style_from_color(%{color: color}) when is_binary(color), do: "color: #{color};"
  defp style_from_color(%{style: style}) when is_binary(style), do: style
  defp style_from_color(_), do: nil

  def nav(assigns) do
    ~H"""
      <nav class="w-full flex justify-between items-center">
        <div class="w-full flex gap-20 items-center">
          <.link href="/">
            <h1 class="text-xl">
              ZK Arcade
            </h1>
            <p class="tex-md text-accent-100 sm:text-nowrap">
              Powered by ALIGNED
            </p>
          </.link>
          <div class="lg:flex hidden w-full gap-10">
              <.link href="/game/beast" class="transition hover:text-accent-100 hover:underline">Games</.link>
              <.link href="/leaderboard" class="transition hover:text-accent-100 hover:underline">Leaderboard</.link>
              <.link href="/history" class="transition hover:text-accent-100 hover:underline">Profile</.link>
              <p class="transition hover:text-accent-100 hover:underline cursor-pointer" id="how-it-works-nav-btn">Tutorial</p>
          </div>
        </div>

        <div class="flex gap-8 items-center">
          <x-app-submit-proof
              network={@network}
              payment_service_address={@payment_service_address}
              user_address={@wallet}
              batcher_url={@batcher_url}
              leaderboard_address={@leaderboard_address}
          />

          <x-app-user-wallet
            network={@network}
            payment_service_address={@payment_service_address}
            user_address={@wallet}
            proofs={@submitted_proofs}
            leaderboard_address={@leaderboard_address}
            username={@username}
            user_position={@user_position}
            explorer_url={@explorer_url}
          />

          <button
            class="lg:hidden z-50"
            id="menu-toggle"
            aria-label="Toggle hamburger menu"
            onclick="toggleMenu()"
          >
            <.icon name="hero-bars-3" class="toggle-open" />
            <.icon name="hero-x-mark" class="toggle-close hidden" />
          </button>
          <div
            id="menu-overlay"
            class="fixed inset-0 bg-background/90 z-40 min-h-dvh w-screen animate-in fade-in hidden"
            onclick="toggleMenu()"
          >
            <div class="h-dvh flex flex-col gap-y-10 text-2xl justify-end items-center p-12">
                <.link href="/" class="text-text-100 transition hover:text-accent-100 hover:underline">Home</.link>
                <.link href="/game/beast" class="text-text-100 transition hover:text-accent-100 hover:underline">Games</.link>
                <.link href="/leaderboard" class="text-text-100 transition hover:text-accent-100 hover:underline">Leaderboard</.link>
                <.link href="/history" class="text-text-100 transition hover:text-accent-100 hover:underline">Profile</.link>
                <p class="transition hover:text-accent-100 hover:underline cursor-pointer" id="how-it-works-nav-btn">How It Works</p>
            </div>
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

    def section_header(%{header: header, subtitle: subtitle} = assigns) do
    ~H"""
      <div class="mb-10 size-fit">
        <h2 class="font-normal text-2xl size-fit" style="padding-right: 60px"><%= @header %></h2>
        <p class="text-md text-text-200 mb-3" style="padding-right: 60px"><%= @subtitle %></p>
        <.line />
      </div>
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

  def step_component(%{number: number, title: title, desc: desc, show_line: show_line} = assigns) do
    ~H"""
    <div class="w-full">

      <div class="flex flex-col w-full justify-center items-center">
        <div class="mb-2 h-[100px] w-[100px] rounded-full bg-accent-100/20 border border-accent-100 flex items-center justify-center">
          <p class="text-2xl text-text-100"><%= @number %></p>
        </div>
        <h3 class="text-text-100 text-xl"><%= @title %></h3>
        <p class="text-text-200 text-md text-center" style="min-width: 220px;"><%= @desc %></p>
      </div>
    </div>
    """
  end

  defp game_content(assigns) do
    ~H"""
    <img class="rounded mb-1 w-full sm:h-[170px]" src={@img} width={280} height={180}/>
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

  def home_statistic(%{label: label, value: value, desc: desc} = assigns) do
    ~H"""
      <div class="bg-contrast-300 p-2 rounded" style="width: 205px">
        <p class="text-text-100 text-sm mb-2"><%= @label %></p>
        <h1 class="font-normal text-accent-100 text-4xl mb-1"><%= @value %></h1>
        <div class="flex w-full justify-end">
          <p class="text-text-100 bg-contrast-100 text-sm rounded" style="padding: 0 5px"><%= @desc %></p>
        </div>
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
      <% :sp1 -> %>
        <p class="mt-2 text-xs text-text-100 bg-sp1/20 border border-sp1 rounded w-fit px-3 font-bold">SP1</p>
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
              Aligned
            </span>
          </p>
        </div>

        <div class="h-full">
          <div class="flex-1 flex flex-wrap gap-10 md:gap-32">
            <%= for {title, links} <- @headers do %>
              <div class="flex flex-col items-start gap-2">
                <h3 class="text-text-100 font-bold text-lg"><%= title %></h3>
                <%= for {value, link} <- links do %>
                  <.link class="text-sm text-text-200 hover:underline" href={link} target="_blank" rel="noopener noreferrer">
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

  attr :address, :string, required: true
  attr :current_wallet, :string, default: nil
  attr :show_you_label, :boolean, default: true
  def wallet_address(assigns) do
    ~H"""
    <p class="text-text-200 text-md">
      <%= String.slice(@address, 0, 6) <> "..." <> String.slice(@address, -4, 4) %>
      <%= if @show_you_label && @address == @current_wallet do %>
        (<span class="text-accent-100">you</span>)
      <% end %>
    </p>
    """
  end

  attr :id, :string, required: true
  attr :users, :list, required: true
  attr :current_wallet, :string, default: nil
  attr :show_labels, :boolean, default: true
  def leaderboard_table(assigns) do
    ~H"""
    <div style="min-width:1000px;">
      <.table id={@id} rows={@users}>
        <:col :let={user} label={if @show_labels, do: "Position", else: ""}>
          <%= user.position %>
          <%= case user.position do %>
            <%= 1 -> %>
            <.icon name="hero-trophy" color="#FFD700" class="" />
            <%= 2 -> %>
            <.icon name="hero-trophy" color="#6a697a" class="" />
            <%= 3 -> %>
            <.icon name="hero-trophy" color="#b36839" class="" />
            <%= _ ->  %>
          <% end %>
        </:col>
        <:col :let={user} label={if @show_labels, do: "Username", else: ""}>
          <p class="text-text-100 text-md"><%= user.username %></p>
        </:col>
        <:col :let={user} label={if @show_labels, do: "Address", else: ""}>
          <.wallet_address address={user.address} current_wallet={@current_wallet} />
        </:col>
        <:col :let={user} label={if @show_labels, do: "Score", else: ""}>
          <%= user.score %>
        </:col>
      </.table>
    </div>
    """
  end

  slot(:inner_block, required: true)
  def button(assigns) do
    ~H"""
    <button class={"rounded-lg py-2 px-3 text-sm border inline-flex"}>
      <%= render_slot(@inner_block) %>
    </button>
    """
  end

  attr :pagination, :map, required: true
  attr :base_path, :string, required: true
  def pagination_controls(assigns) do
    ~H"""
    <div class="flex gap-x-2 items-center justify-center min-w-full">
      <%= if @pagination.current_page >= 2 do %>
        <.link href={"/leaderboard?page=#{1}"}>
          <.button>
            First
          </.button>
        </.link>
      <% end %>
      <%= if @pagination.current_page > 1 do %>
        <.link href={"/leaderboard?page=#{@pagination.current_page - 1}"}>
          <.button>
            <.icon
              name="hero-arrow-left-solid"
              class={"stroke-inherit flex group-hover:-translate-x-0.5 transition-all duration-150"}
            />
          </.button>
        </.link>
      <% end %>
      <form phx-submit="change_page" class="">
        <input
          name="page"
          id="page"
          class={ "text-center w-20 rounded-lg py-2 px-3 bg-black text-white border" }
          value={@pagination.current_page}
          min="1"
        />
      </form>
      <%= if @pagination.current_page != @pagination.total_pages do %>
        <.link href={"/leaderboard?page=#{@pagination.current_page + 1}"}>
          <.button>
            <.icon
              name="hero-arrow-right-solid"
              class={"stroke-inherit group-hover:translate-x-0.5 transition-all duration-150"}
            />
          </.button>
        </.link>
        <.link href={"/leaderboard?page=#{@pagination.total_pages}"}>
          <.button>
            Last
          </.button>
        </.link>
      <% end %>
    </div>
    """
  end

  attr :pagination, :map, required: true
  attr :items_per_page, :integer, default: 10
  def pagination_info(assigns) do
    ~H"""
    <div class="text-center mt-4 text-text-200">
      Showing <%= (@pagination.current_page - 1) * @items_per_page + 1 %>-<%= min(@pagination.current_page * @items_per_page, @pagination.total_users) %>
      of <%= @pagination.total_users %> users
    </div>
    """
  end

  attr :user_data, :map, required: true
  attr :current_wallet, :string, required: true
  def user_position_display(assigns) do
    ~H"""
    <div>
      <p> ... </p>
      <div class="">
        <.leaderboard_table
          id="user-position"
          users={[@user_data]}
          current_wallet={@current_wallet}
          show_labels={false} />
      </div>
    </div>
    """
  end

  attr :users, :list, required: true
  attr :current_wallet, :string, default: nil
  attr :user_data, :map, default: nil
  attr :pagination, :map, default: nil
  attr :show_pagination, :boolean, default: false
  attr :show_view_all_link, :boolean, default: false

  def leaderboard_section(assigns) do
    ~H"""
    <%= if length(@users) > 0 do %>
      <div class="w-full">
        <div class="overflow-x-auto">
          <.leaderboard_table
            id="leaderboard"
            users={@users}
            current_wallet={@current_wallet} />

          <%= if @user_data do %>
            <.user_position_display user_data={@user_data} current_wallet={@current_wallet} />
          <% end %>
        </div>
      </div>

      <%= if @show_pagination && @pagination do %>
        <div class="mt-8">
          <.pagination_controls pagination={@pagination} base_path="/leaderboard" />
          <.pagination_info pagination={@pagination} />
        </div>
      <% end %>

      <%= if @show_view_all_link do %>
        <div class="flex justify-end mt-10">
          <a href="/leaderboard">
            <div class="hidden md:block cursor-pointer inline-flex items-center space-x-2 group">
              <span>View complete leaderboard</span>
              <.icon name="hero-arrow-long-right" class="size-7 transition-transform duration-200 group-hover:translate-x-1" />
            </div>
          </a>
        </div>
      <% end %>
    <% else %>
      <p class="text-text-200 text-md">No users found in the leaderboard.</p>
    <% end %>
    """
  end
end
