import Config

# config/runtime.exs is executed for all environments, including
# during releases. It is executed after compilation and before the
# system starts, so it is typically used to load production configuration
# and secrets from environment variables or elsewhere. Do not define
# any compile-time configuration in here, as it won't be applied.
# The block below contains prod specific runtime configuration.

# ## Using releases
#
# If you use `mix release`, you need to explicitly enable the server
# by passing the PHX_SERVER=true when you start it:
#
#     PHX_SERVER=true bin/zk_arcade start
#
# Alternatively, you can use `mix phx.gen.release` to generate a `bin/server`
# script that automatically sets the env var above.
config :zk_arcade, :execution_env, config_env()

if System.get_env("PHX_SERVER") do
  config :zk_arcade, ZkArcadeWeb.Endpoint, server: true
end

config :zk_arcade, time_limit: System.get_env("CLAIM_TIME_LIMIT") || "2734912000"

if config_env() == :prod do
  database_url =
    System.get_env("DATABASE_URL") ||
      raise """
      environment variable DATABASE_URL is missing.
      For example: ecto://USER:PASS@HOST/DATABASE
      """

  maybe_ipv6 = if System.get_env("ECTO_IPV6") in ~w(true 1), do: [:inet6], else: []

  config :zk_arcade, ZkArcade.Repo,
    # ssl: true,
    url: database_url,
    pool_size: String.to_integer(System.get_env("POOL_SIZE") || "10"),
    socket_options: maybe_ipv6

  # The secret key base is used to sign/encrypt cookies and other secrets.
  # A default value is used in config/dev.exs and config/test.exs but you
  # want to use a different value for prod and you most likely don't want
  # to check this value into version control, so we use an environment
  # variable instead.
  secret_key_base =
    System.get_env("SECRET_KEY_BASE") ||
      raise """
      environment variable SECRET_KEY_BASE is missing.
      You can generate one by calling: mix phx.gen.secret
      """

  host = System.get_env("PHX_HOST") || "example.com"
  port = String.to_integer(System.get_env("PORT") || "4000")
  port_ssl = String.to_integer(System.get_env("PORT_SSL") || "443")

  config :zk_arcade, :dns_cluster_query, System.get_env("DNS_CLUSTER_QUERY")

  config :zk_arcade, ZkArcadeWeb.Endpoint,
    url: [
      scheme: "https",
      port: port_ssl,
      host: host
    ],
    https: [
      port: port_ssl,
      cipher_suite: :strong,
      keyfile: System.get_env("KEYFILE_PATH"),
      certfile: System.get_env("CERTFILE_PATH")
    ],
    http: [
      # Enable IPv6 and bind on all interfaces.
      # Set it to  {0, 0, 0, 0, 0, 0, 0, 1} for local network only access.
      # See the documentation on https://hexdocs.pm/bandit/Bandit.html#t:options/0
      # for details about using IPv6 vs IPv4 and loopback vs public addresses.
      ip: {0, 0, 0, 0, 0, 0, 0, 0},
      port: port
    ],
    secret_key_base: secret_key_base

  config :zk_arcade,
         :proxy_contract_address,
         System.get_env("ZK_ARCADE_PROXY_CONTRACT_ADDRESS")

  config :zk_arcade, :network, System.get_env("ZK_ARCADE_NETWORK")

  newrelic_license_key = System.get_env("NEWRELIC_KEY")
  newrelic_app_name = System.get_env("NEWRELIC_APP_NAME")

  config :new_relic_agent,
    app_name: newrelic_app_name,
    license_key: newrelic_license_key,
    httpc_request_options: [connect_timeout: 5000],
    logs_in_context: :direct

  # ## SSL Support
  #
  # To get SSL working, you will need to add the `https` key
  # to your endpoint configuration:
  #
  #     config :zk_arcade, ZkArcadeWeb.Endpoint,
  #       https: [
  #         ...,
  #         port: 443,
  #         cipher_suite: :strong,
  #         keyfile: System.get_env("SOME_APP_SSL_KEY_PATH"),
  #         certfile: System.get_env("SOME_APP_SSL_CERT_PATH")
  #       ]
  #
  # The `cipher_suite` is set to `:strong` to support only the
  # latest and more secure SSL ciphers. This means old browsers
  # and clients may not be supported. You can set it to
  # `:compatible` for wider support.
  #
  # `:keyfile` and `:certfile` expect an absolute path to the key
  # and cert in disk or a relative path inside priv, for example
  # "priv/ssl/server.key". For all supported SSL configuration
  # options, see https://hexdocs.pm/plug/Plug.SSL.html#configure/1
  #
  # We also recommend setting `force_ssl` in your config/prod.exs,
  # ensuring no data is ever sent via http, always redirecting to https:
  #
  #     config :zk_arcade, ZkArcadeWeb.Endpoint,
  #       force_ssl: [hsts: true]
  #
  # Check `Plug.SSL` for all available options in `force_ssl`.
end
