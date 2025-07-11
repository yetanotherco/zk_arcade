defmodule ZkArcadeWeb.PageController do
  require Logger
  use ZkArcadeWeb, :controller

  def home(conn, _params) do
    wallet =
      if address = get_session(conn, :wallet_address) do
        case ZkArcade.Accounts.fetch_wallet_by_address(address) do
          {:ok, wallet} -> wallet
          _ -> nil
        end
      else
        nil
      end

    conn
    |> assign(:wallet, wallet)
    |> render(:home)
  end

  def disconnect_wallet(conn, _params) do
    conn
    |> delete_session(:wallet_address)
    |> redirect(to: ~p"/")
  end

  def game(conn, %{"name" => _game_name}) do
     conn
      |> assign(:game, %{
        image: "/images/beast1984.webp",
        name: "Beast 1984",
        desc: "Survive across waves of enemies",
        full_desc: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Proin dapibus, felis sit amet convallis iaculis, felis purus commodo nibh, at sodales velit arcu a odio. Pellentesque dapibus volutpat odio, eu rutrum mauris malesuada et. Aliquam ligula velit, ultricies et mattis quis, ultrices in elit. Nam eget erat finibus, scelerisque purus eleifend, pretium lacus. Nam vitae tellus rhoncus, ornare libero eget, aliquam risus. Morbi lacinia lacinia ultricies. Morbi volutpat sollicitudin eros at vehicula. Pellentesque sed neque luctus, laoreet mi id, luctus est. Vivamus dictum ullamcorper lorem, non hendrerit purus condimentum et. Vestibulum viverra ligula vel lacinia porttitor. Donec blandit, ligula sit amet condimentum accumsan, quam elit sagittis nisl, et commodo lorem justo eget erat. Nam maximus arcu vel nibh feugiat accumsan. Ut aliquam massa ut pulvinar sagittis. Sed dictum mauris nec pretium feugiat. Aliquam erat volutpat. Mauris scelerisque sodales ex vel convallis.",
        how_to_play: "1. Download game base on your platform [here]\n2. Play game\n3. Locate the generated proof\n4. Upload your proof",
      })
      |> render(:game)
  end
end
