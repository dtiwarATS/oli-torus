import Config

get_env_as_boolean = fn key, default ->
  System.get_env(key, default)
  |> String.downcase()
  |> String.trim()
  |> case do
    "true" -> true
    _ -> false
  end
end

config :oli,
  env: :dev,
  s3_xapi_bucket_name: System.get_env("S3_XAPI_BUCKET_NAME"),
  s3_media_bucket_name: System.get_env("S3_MEDIA_BUCKET_NAME"),
  media_url: System.get_env("MEDIA_URL"),
  problematic_query_detection:
    get_env_as_boolean.("DEV_PROBLEMATIC_QUERY_DETECTION_ENABLED", "false"),
  load_testing_mode: get_env_as_boolean.("LOAD_TESTING_MODE", "false"),
  slack_webhook_url: System.get_env("SLACK_WEBHOOK_URL"),
  blackboard_application_client_id: System.get_env("BLACKBOARD_APPLICATION_CLIENT_ID"),
  branding: [
    name: System.get_env("BRANDING_NAME", "OLI Torus"),
    logo: System.get_env("BRANDING_LOGO", "/branding/dev/oli_torus_logo.png"),
    logo_dark:
      System.get_env(
        "BRANDING_LOGO_DARK",
        System.get_env("BRANDING_LOGO", "/branding/dev/oli_torus_logo_dark.png")
      ),
    favicons: System.get_env("BRANDING_FAVICONS_DIR", "/branding/dev/favicons")
  ],
  log_incomplete_requests: get_env_as_boolean.("LOG_INCOMPLETE_REQUESTS", "true")

config :oli, :vendor_property,
  workspace_logo:
    System.get_env("VENDOR_PROPERTY_WORKSPACE_LOGO", "/branding/dev/oli_torus_icon.png"),
  support_email: System.get_env("VENDOR_PROPERTY_SUPPORT_EMAIL", "support@example.com")

# Configure your database
config :oli, Oli.Repo,
  username: System.get_env("DB_USER", "postgres"),
  password: System.get_env("DB_PASSWORD", "postgres"),
  database: System.get_env("DB_NAME", "oli_ng_dev"),
  hostname: System.get_env("DB_HOST", "localhost"),
  show_sensitive_data_on_connection_error: true,
  pool_size: 10,
  timeout: 600_000,
  ownership_timeout: 600_000,
  log: String.to_existing_atom(System.get_env("DEV_DB_LOG_LEVEL", "debug"))

# Configure email for development
config :oli, Oli.Mailer, adapter: Swoosh.Adapters.Local

config :oli,
  ecl_username: System.get_env("ECL_USERNAME", ""),
  ecl_password: System.get_env("ECL_PASSWORD", "")

config :oli, :stripe_provider,
  public_secret: "pk_test_TYooMQauvdEDq54NiTphI7jx",
  private_secret: "sk_test_4eC39HqLyjWDarjtT1zdp7dc"

config :oli, :cashnet_provider,
  cashnet_store: System.get_env("CASHNET_STORE"),
  cashnet_checkout_url: System.get_env("CASHNET_CHECKOUT_URL"),
  cashnet_client: System.get_env("CASHNET_CLIENT"),
  cashnet_gl_number: System.get_env("CASHNET_GL_NUMBER")

# Configurable http/https protocol options for cowboy
# https://ninenines.eu/docs/en/cowboy/2.5/manual/cowboy_http/
http_max_header_name_length =
  System.get_env("HTTP_MAX_HEADER_NAME_LENGTH", "64") |> String.to_integer()

http_max_header_value_length =
  System.get_env("HTTP_MAX_HEADER_VALUE_LENGTH", "4096") |> String.to_integer()

http_max_headers = System.get_env("HTTP_MAX_HEADERS", "100") |> String.to_integer()

# For development, we disable any cache and enable
# debugging and code reloading.
#
# The watchers configuration can be used to run external
# watchers to your application. For example, we use it
# with webpack to recompile .js and .css sources.
config :oli, OliWeb.Endpoint,
  http: [
    port: String.to_integer(System.get_env("HTTP_PORT", "80")),
    protocol_options: [
      max_header_name_length: http_max_header_name_length,
      max_header_value_length: http_max_header_value_length,
      max_headers: http_max_headers
    ]
  ],
  url: [
    scheme: System.get_env("SCHEME", "https"),
    host: System.get_env("HOST", "localhost"),
    port: String.to_integer(System.get_env("PORT", "443"))
  ],
  https: [
    port: String.to_integer(System.get_env("HTTPS_PORT", "443")),
    otp_app: :oli,
    keyfile: System.get_env("SSL_KEY_PATH", "priv/ssl/localhost.key"),
    certfile: System.get_env("SSL_CERT_PATH", "priv/ssl/localhost.crt"),
    protocol_options: [
      max_header_name_length: http_max_header_name_length,
      max_header_value_length: http_max_header_value_length,
      max_headers: http_max_headers
    ]
  ],
  debug_errors: true,
  code_reloader: true,
  check_origin: false,
  watchers: [
    node: [
      "node_modules/webpack/bin/webpack.js",
      "--mode",
      "development",
      "--watch",
      "--watch-options-stdin",
      cd: Path.expand("../assets", __DIR__)
    ],
    node: [
      "node_modules/webpack/bin/webpack.js",
      "--config",
      "webpack.config.node.js",
      "--mode",
      "production",
      "--watch",
      "--watch-options-stdin",
      cd: Path.expand("../assets", __DIR__)
    ],
    tailwind: {Tailwind, :install_and_run, [:default, ~w(--watch)]}
  ]

# ## SSL Support
#
# In order to use HTTPS in development, a self-signed
# certificate can be generated by running the following
# Mix task:
#
#     mix phx.gen.cert
#
# Note that this task requires Erlang/OTP 20 or later.
# Run `mix help phx.gen.cert` for more information.
#
# The `http:` config above can be replaced with:
#
#     https: [
#       port: 4001,
#       cipher_suite: :strong,
#       keyfile: "priv/cert/selfsigned_key.pem",
#       certfile: "priv/cert/selfsigned.pem"
#     ],
#
# If desired, both `http:` and `https:` keys can be
# configured to run both http and https servers on
# different ports.

# Watch static and templates for browser reloading.
config :oli, OliWeb.Endpoint,
  live_reload: [
    patterns: [
      ~r"priv/static/.*(js|css|png|jpeg|jpg|gif|svg)$",
      ~r"priv/gettext/.*(po)$",
      ~r"lib/oli_web/{live,views}/.*(ex)$",
      ~r"lib/oli_web/templates/.*(eex)$"
    ]
  ]

# Do not include metadata nor timestamps in development logs
config :logger, :console, format: "[$level] $message\n"

truncate =
  System.get_env("LOGGER_TRUNCATE", "8192")
  |> String.downcase()
  |> case do
    "infinity" ->
      :infinity

    val ->
      String.to_integer(val)
  end

config :logger, truncate: truncate

# Set a higher stacktrace during development. Avoid configuring such
# in production as building large stacktraces may be expensive.
config :phoenix, :stacktrace_depth, 20

# Initialize plugs at runtime for faster development compilation
config :phoenix, :plug_init_mode, :runtime

# Configure Joken for jwt signing and verification
config :joken, default_signer: "secret"

config :appsignal, :config, active: false

# Configure AWS
config :ex_aws,
  region: System.get_env("AWS_REGION", "us-east-1"),
  access_key_id: System.get_env("AWS_ACCESS_KEY_ID", "your_minio_access_key"),
  secret_access_key: System.get_env("AWS_SECRET_ACCESS_KEY", "your_minio_secret_key")

config :ex_aws, :s3, region: System.get_env("AWS_REGION", "us-east-1")

config :ex_aws, :hackney_opts,
  follow_redirect: true,
  recv_timeout: 200_000

# Configure development reCAPTCHA. This is a publicly available test key and will
# render a warning to prevent it from being used in production.
# https://developers.google.com/recaptcha/docs/faq#id-like-to-run-automated-tests-with-recaptcha.-what-should-i-do
config :oli, :recaptcha,
  verify_url: "https://www.google.com/recaptcha/api/siteverify",
  timeout: 5000,
  site_key: System.get_env("RECAPTCHA_SITE_KEY", "6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI"),
  secret: System.get_env("RECAPTCHA_PRIVATE_KEY", "6LeIxAcTAAAAAGG-vFI1TnRWxMZNFuojJ4WifJWe")
