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
        <div class="w-full flex gap-12 items-center">
          <.link href="/">
            <h1 class="text-xl">
              ZK Arcade
            </h1>
            <p class="tex-md text-accent-100 sm:text-nowrap">
              Powered by ALIGNED
            </p>
          </.link>
          <div class="lg:flex hidden w-full gap-10">
              <.link href="/games" class="transition hover:text-accent-100 hover:underline">Games</.link>
              <.link href="/leaderboard" class="transition hover:text-accent-100 hover:underline">Leaderboard</.link>
              <.link href="/history" class="transition hover:text-accent-100 hover:underline">Profile</.link>
              <button class="transition hover:text-accent-100 hover:underline" id="how-it-works-nav-btn">
                Tutorial
              </button>
          </div>
        </div>

        <div class="flex gap-6 items-center">
          <x-app-user-wallet
              network={@network}
              payment_service_address={@payment_service_address}
              user_address={@wallet}
              proofs={@submitted_proofs}
              leaderboard_address={@leaderboard_address}
              username={@username}
              user_position={@user_position}
              explorer_url={@explorer_url}
              batcher_url={@batcher_url}
              beast_submissions={@beast_submissions}
          />

          <div class="relative hidden lg:block">
            <button
              id="kebab-toggle"
              class="p-2 hover:bg-contrast-100 rounded transition-colors"
              aria-label="Toggle kebab menu"
              onclick="toggleKebabMenu()"
            >
              <.icon name="hero-ellipsis-vertical" class="w-7 h-7" />
            </button>

            <div
              id="kebab-dropdown"
              class="absolute right-0 top-full mt-2 w-48 bg-background border border-contrast-200 rounded-lg shadow-lg z-50 hidden"
            >
              <div>
                <.link
                  href="/#faq"
                  class="block px-4 py-2 text-sm hover:bg-contrast-100 transition-colors"
                >
                  FAQ
                </.link>
                <.link
                  href={Application.get_env(:zk_arcade, :feedback_form_url)}
                  class="block px-4 py-2 text-sm hover:bg-contrast-100 transition-colors rounded-bl-lg rounded-br-lg"
                  target="_blank"
					        rel="noopener noreferrer"
                >
                  Give us Feedback
                </.link>
              </div>
            </div>
          </div>

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
                <.link href="/games" class="text-text-100 transition hover:text-accent-100 hover:underline">Games</.link>
                <.link href="/leaderboard" class="text-text-100 transition hover:text-accent-100 hover:underline">Leaderboard</.link>
                <.link href="/history" class="text-text-100 transition hover:text-accent-100 hover:underline">Profile</.link>
                <p class="transition hover:text-accent-100 hover:underline cursor-pointer" id="how-it-works-nav-btn">Tutorial</p>
                <.link href="#faq" class="text-text-100 transition hover:text-accent-100 hover:underline">FAQ</.link>
                <.link href={Application.get_env(:zk_arcade, :feedback_form_url)} target="_blank" rel="noopener noreferrer" class="text-text-100 transition hover:text-accent-100 hover:underline">Give us Feedback</.link>
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

    def section_header(%{subtitle: _subtitle} = assigns) do
    ~H"""
      <div class="mb-10 size-fit">
        <h2 class="font-normal text-2xl size-fit" style="padding-right: 60px"><%= @header %></h2>
        <p class="text-md text-text-200 mb-3" style="padding-right: 60px"><%= @subtitle %></p>
        <.line />
      </div>
    """
  end

  def section_header(assigns) do
    ~H"""
      <div class="mb-10 size-fit">
        <h2 class="mb-2 font-normal text-2xl size-fit" style="padding-right: 60px"><%= @header %></h2>
        <.line />
      </div>
    """
  end

  def home_game_component(assigns) do
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

  def games_game_component(assigns) do
    ~H"""
    <%= if @disabled == "true" do %>
      <div class="w-full opacity-75 sm:max-w-280">
        <.games_game_content tags={@tags} title={@title} desc={@desc} img={@img} />
      </div>
    <% else %>
      <.link href={@link}>
        <div class="cursor-pointer group w-full sm:max-w-280">
          <.games_game_content tags={@tags} title={@title} desc={@desc} img={@img} />
        </div>
      </.link>
    <% end %>
    """
  end

  def games_game_content(assigns) do
    ~H"""
    <div class="w-full flex justify-between flex-wrap">
      <div class="max-w-[500px]">
        <img class="rounded mb-2 w-full sm:h-[170px]" src={@img} width={280} height={180}/>
        <div class="mb-2 flex gap-2">
          <%= for variant <- @tags do %>
            <.tag variant={variant} />
          <% end %>
        </div>
        <div>
            <h3 class="group-hover:underline text-xl"><%= @title %></h3>
            <p class="text-text-200"><%= @desc %></p>
        </div>
      </div>
    </div>
    """
  end

  attr :number, :string, required: true
  attr :question, :string, required: true
  attr :answer, :string, required: true
  attr :expanded, :boolean, default: false
  attr :class, :string, default: ""
  attr :id, :string, required: true

  def faq_entry(assigns) do
    ~H"""
    <div class={["scroll-observer transition-[opacity,border] duration-500 hover:opacity-100 group-hover:opacity-50 border-t border-contrast-100 hover:border-accent-100/30", @class]} data-entry="fade-in-up">
      <div
        class="group flex !max-w-none cursor-pointer select-none justify-between gap-6 text-lg py-5"
        onclick={"toggleFaq('#{@id}')"}
      >
        <div class="flex">
          <div class="hidden min-w-15 pr-4 transition-opacity md:block opacity-30">
            <div class="text-sm text-text-200">
              <%= @number %>
            </div>
          </div>
          <div class="relative">
            <div class="transition-opacity duration-500 text-lg text-text-100">
              <%= @question %>
            </div>
            <div class="pointer-events-none absolute left-0 top-0 duration-500 opacity-0 group-hover:opacity-100 text-lg text-accent-gradient">
              <%= @question %>
            </div>
          </div>
        </div>

        <div class="relative h-[11px] w-[11px] shrink-0 transition-opacity opacity-30 group-hover:opacity-100">
          <div class={[
            "absolute shrink-0 bg-text-100 transition-transform duration-300 left-[5px] top-0 h-full w-[1px]",
            @expanded && "rotate-90"
          ]} id={"#{@id}-icon-v"}></div>
          <div class={[
            "absolute shrink-0 bg-text-100 transition-transform duration-300 left-0 top-[5px] h-[1px] w-full",
            @expanded && "rotate-90"
          ]} id={"#{@id}-icon-h"}></div>
        </div>
      </div>

      <div class={[
        "transition-grid grid grid-rows-[0fr]",
        @expanded && "grid-rows-[1fr]"
      ]} id={"#{@id}-content"}>
        <div class="overflow-hidden lg:pl-[60px] pr-[40px]">
          <div class="pb-5">
            <p class="text-text-200"><%= @answer %></p>
          </div>
        </div>
      </div>
    </div>
    """
  end

  attr :faqs, :list, required: true
  attr :class, :string, default: ""

  def faq_list(assigns) do
    ~H"""
    <div class={["", @class]}>
      <div>
        <%= for {faq, index} <- Enum.with_index(@faqs) do %>
          <.faq_entry
            id={"faq-#{index}"}
            number={faq.number}
            question={faq.question}
            answer={faq.answer}
            expanded={false}
          />
        <% end %>
      </div>
    </div>

    <script>
      function toggleFaq(faqId) {
        const content = document.getElementById(faqId + '-content');
        const iconV = document.getElementById(faqId + '-icon-v');
        const iconH = document.getElementById(faqId + '-icon-h');

        const isExpanded = content.classList.contains('grid-rows-[1fr]');

        if (isExpanded) {
          // Collapse
          content.classList.remove('grid-rows-[1fr]');
          iconV?.classList.remove('rotate-90');
          iconH?.classList.remove('rotate-90');
        } else {
          // Expand
          content.classList.add('grid-rows-[1fr]');
          iconV?.classList.add('rotate-90');
          iconH?.classList.add('rotate-90');
        }
      }
    </script>
    """
  end

  def step_component(assigns) do
    ~H"""
    <div class="w-full">

      <div class="flex flex-col w-full justify-center items-center">
        <div class="mb-2 h-[100px] w-[100px] rounded-full bg-accent-100/20 border border-accent-100 flex items-center justify-center">
          <p class="text-2xl text-text-100"><%= @number %></p>
        </div>
        <h3 class="text-text-100 text-center text-xl"><%= @title %></h3>
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

  def home_game_component_hero(assigns) do
    ~H"""
    <%= if @disabled == "true" do %>
      <div class="w-[350px] h-full flex flex-col shrink-0 p-5 bg-contrast-300 rounded">
        <.game_content_hero tags={@tags} title={@title} desc={@desc} img={@img} />
      </div>
    <% else %>
      <.link href={@link} class="w-[350px] h-full shrink-0">
        <div class="w-full h-full flex flex-col cursor-pointer bg-contrast-300 rounded p-5 group">
          <.game_content_hero tags={@tags} title={@title} desc={@desc} img={@img} />
        </div>
      </.link>
    <% end %>
    """
  end

  defp game_content_hero(assigns) do
    ~H"""
    <div class="flex gap-2">
      <img class="rounded mb-1 w-full h-[75px] w-[100px]" src={@img}/>
      <p class="text-xs text-text-200"><%= @desc %></p>
    </div>
    <div>
        <h3 class="text-lg font-normal group-hover:underline underline-offset-4">
          <%= @title %>
        </h3>
      <div class="flex gap-2">
        <%= for variant <- @tags do %>
          <.tag variant={variant} />
        <% end %>
      </div>
    </div>
    """
  end

  def home_statistic(assigns) do
    ~H"""
      <div class="bg-contrast-300 p-2 flex flex-col justify-between rounded h-full w-full">
        <div>
          <p class="text-text-100 text-sm mb-2"><%= @label %></p>
          <h1 class="font-normal text-accent-100 text-4xl mb-1"><%= @value %></h1>
        </div>
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
          <th :for={{col, _i} <- Enum.with_index(@col)} class="text-left font-normal">
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
            class={classes(["p-0 pr-10", col[:class]])}
          >
            <div class={
              classes([
                "group block normal-case text-base min-w-29"
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
            <% 1 -> %>
            <.icon name="hero-trophy" color="#FFD700" class="" />
            <% 2 -> %>
            <.icon name="hero-trophy" color="#6a697a" class="" />
            <% 3 -> %>
            <.icon name="hero-trophy" color="#b36839" class="" />
            <% _ ->  %>
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
        <.link href={"#{@base_path}?page=#{1}"}>
          <.button>
            First
          </.button>
        </.link>
      <% end %>
      <%= if @pagination.current_page > 1 do %>
        <.link href={"#{@base_path}?page=#{@pagination.current_page - 1}"}>
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
        <.link href={"#{@base_path}?page=#{@pagination.current_page + 1}"}>
          <.button>
            <.icon
              name="hero-arrow-right-solid"
              class={"stroke-inherit group-hover:translate-x-0.5 transition-all duration-150"}
            />
          </.button>
        </.link>
        <.link href={"#{@base_path}?page=#{@pagination.total_pages}"}>
          <.button>
            Last
          </.button>
        </.link>
      <% end %>
    </div>
    """
  end

  attr :pagination, :map, required: true
  attr :paginated_item_name, :string, default: "users"
  def pagination_info(assigns) do
    ~H"""
    <div class="text-center mt-4 text-text-200">
      Showing <%= (@pagination.current_page - 1) * @pagination.items_per_page + 1 %>-<%= min(@pagination.current_page * @pagination.items_per_page, @pagination.total_users) %>
      of <%= @pagination.total_users %> <%= @paginated_item_name %>
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

  attr :pagination, :map, default: nil
  attr :show_pagination, :boolean, default: false
  def history_section(assigns) do
    ~H"""
      <%= if @show_pagination && @pagination do %>
        <div>
          <.pagination_controls pagination={@pagination} base_path="/history" />
          <.pagination_info pagination={@pagination} paginated_item_name={"proofs"} />
        </div>
      <% end %>
    """
  end

  attr :users, :list, required: true
  attr :current_wallet, :string, default: nil
  attr :user_data, :map, default: nil
  attr :pagination, :map, default: nil
  attr :show_pagination, :boolean, default: false
  attr :show_view_all_link, :boolean, default: false

  def leaderboard_home(assigns) do
    ~H"""
    <%= if length(@users) > 0 do %>
      <div class="w-full h-full flex flex-col justify-between">
        <.leaderboard_table_home
          id="leaderboard"
          users={@users}
          current_wallet={@current_wallet}
          show_labels={false}
          />
        <.link href="/leaderboard" class="text-center text-sm w-full hover:underline block mt-1 pb-5">
          View all
        </.link>
      </div>
    <% else %>
      <p class="text-text-200 text-md">No users found in the leaderboard.</p>
    <% end %>
    """
  end

  attr :id, :string, required: true
  attr :users, :list, required: true
  attr :current_wallet, :string, default: nil
  attr :show_labels, :boolean, default: true
  defp leaderboard_table_home(assigns) do
    ~H"""
    <div class="w-full">
      <.table id={@id} rows={@users}>
        <:col :let={user} label={if @show_labels, do: "Username", else: ""} class="w-full pr-0">
          <p class="ellipsis text-text-100 text-md"><%= user.username %></p>
        </:col>
        <:col :let={user} label={if @show_labels, do: "Score", else: ""} class="pr-0 w-20 text-right">
          <%= user.score %>
          <%= case user.position do %>
            <% 1 -> %>
            <.icon name="hero-trophy" color="#FFD700" class="" />
            <% 2 -> %>
            <.icon name="hero-trophy" color="#6a697a" class="" />
            <% 3 -> %>
            <.icon name="hero-trophy" color="#b36839" class="" />
            <% _ ->  %>
          <% end %>
        </:col>
      </.table>
    </div>
    """
  end
end
