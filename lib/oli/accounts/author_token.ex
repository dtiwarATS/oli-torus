defmodule Oli.Accounts.AuthorToken do
  use Ecto.Schema
  import Ecto.Query
  alias Oli.Accounts.AuthorToken

  @hash_algorithm :sha256
  @rand_size 32

  # It is very important to keep the reset password token expiry short,
  # since someone with access to the email may take over the account.
  @reset_password_validity_in_days 1
  @confirm_validity_in_days 7
  @change_email_validity_in_days 7
  @session_validity_in_days 60
  @author_invitation_validity_in_days 30
  @collaborator_invitation_validity_in_days 30

  schema "authors_tokens" do
    field :token, :binary
    # the context is used to differentiate between different types of tokens
    # such as "confirm" (for email confirmation), "reset_password", "collaborator_invitation:<project_slug>".
    field :context, :string
    field :sent_to, :string
    belongs_to :author, Oli.Accounts.Author

    timestamps(type: :utc_datetime, updated_at: false)
  end

  @doc """
  Generates a token that will be stored in a signed place,
  such as session or cookie. As they are signed, those
  tokens do not need to be hashed.

  The reason why we store session tokens in the database, even
  though Phoenix already provides a session cookie, is because
  Phoenix' default session cookies are not persisted, they are
  simply signed and potentially encrypted. This means they are
  valid indefinitely, unless you change the signing/encryption
  salt.

  Therefore, storing them allows individual author
  sessions to be expired. The token system can also be extended
  to store additional data, such as the device used for logging in.
  You could then use this information to display all valid sessions
  and devices in the UI and allow authors to explicitly expire any
  session they deem invalid.
  """
  def build_session_token(author) do
    token = :crypto.strong_rand_bytes(@rand_size)
    {token, %AuthorToken{token: token, context: "session", author_id: author.id}}
  end

  @doc """
  Checks if the token is valid and returns its underlying lookup query.

  The query returns the author found by the token, if any.

  The token is valid if it matches the value in the database and it has
  not expired (after @session_validity_in_days).
  """
  def verify_session_token_query(token) do
    query =
      from token in token_and_context_query(token, "session"),
        join: author in assoc(token, :author),
        where: token.inserted_at > ago(@session_validity_in_days, "day"),
        select: author

    {:ok, query}
  end

  @doc """
  Builds a token and its hash to be delivered to the author's email.

  The non-hashed token is sent to the author email while the
  hashed part is stored in the database. The original token cannot be reconstructed,
  which means anyone with read-only access to the database cannot directly use
  the token in the application to gain access. Furthermore, if the author changes
  their email in the system, the tokens sent to the previous email are no longer
  valid.

  Authors can easily adapt the existing code to provide other types of delivery methods,
  for example, by phone numbers.
  """
  def build_email_token(author, context) do
    build_hashed_token(author, context, author.email)
  end

  defp build_hashed_token(author, context, sent_to) do
    token = :crypto.strong_rand_bytes(@rand_size)
    hashed_token = :crypto.hash(@hash_algorithm, token)

    {Base.url_encode64(token, padding: false),
     %AuthorToken{
       token: hashed_token,
       context: context,
       sent_to: sent_to,
       author_id: author.id
     }}
  end

  @doc """
  Checks if the token is valid and returns its underlying lookup query.

  The query returns the author found by the token, if any.

  The given token is valid if it matches its hashed counterpart in the
  database and the author email has not changed. This function also checks
  if the token is being used within a certain period, depending on the
  context. The default contexts supported by this function are either
  "confirm", for account confirmation emails, and "reset_password",
  for resetting the password. For verifying requests to change the email,
  see `verify_change_email_token_query/2`.
  """
  def verify_email_token_query(token, context) do
    case Base.url_decode64(token, padding: false) do
      {:ok, decoded_token} ->
        hashed_token = :crypto.hash(@hash_algorithm, decoded_token)
        days = days_for_context(context)

        query =
          from token in token_and_context_query(hashed_token, context),
            join: author in assoc(token, :author),
            where: token.inserted_at > ago(^days, "day") and token.sent_to == author.email,
            select: author

        {:ok, query}

      :error ->
        :error
    end
  end

  defp days_for_context("confirm"), do: @confirm_validity_in_days
  defp days_for_context("reset_password"), do: @reset_password_validity_in_days

  @doc """
  Checks if the token is valid and returns its underlying lookup query.

  The query returns the author found by the token, if any.

  This is used to validate requests to change the author
  email. It is different from `verify_email_token_query/2` precisely because
  `verify_email_token_query/2` validates the email has not changed, which is
  the starting point by this function.

  The given token is valid if it matches its hashed counterpart in the
  database and if it has not expired (after @change_email_validity_in_days).
  The context must always start with "change:".
  """
  def verify_change_email_token_query(token, "change:" <> _ = context) do
    case Base.url_decode64(token, padding: false) do
      {:ok, decoded_token} ->
        hashed_token = :crypto.hash(@hash_algorithm, decoded_token)

        query =
          from token in token_and_context_query(hashed_token, context),
            where: token.inserted_at > ago(@change_email_validity_in_days, "day")

        {:ok, query}

      :error ->
        :error
    end
  end

  @doc """
  Checks if the token is valid and returns its underlying lookup query.

  The query returns the author_token found by the token, if any.

  This is used to validate requests to accept an email invitation.

  The given token is valid if it matches its hashed counterpart in the
  database and if it has not expired (after @author_invitation_validity_in_days).
  """
  def author_invitation_token_query(token) do
    case Base.url_decode64(token, padding: false) do
      {:ok, decoded_token} ->
        hashed_token = :crypto.hash(@hash_algorithm, decoded_token)

        query =
          from(at in AuthorToken,
            where:
              at.token == ^hashed_token and at.context == "author_invitation" and
                at.inserted_at > ago(@author_invitation_validity_in_days, "day")
          )

        {:ok, query}

      :error ->
        :error
    end
  end

  @doc """
  Checks if the token is valid and returns its underlying lookup query.

  The query returns the author_token found by the token, if any.

  This is used to validate requests to accept an
  email invitation.

  The given token is valid if it matches its hashed counterpart in the
  database and if it has not expired (after @collaborator_invitation_validity_in_days).
  The context must always start with "collaborator_invitation:".
  """
  def collaborator_invitation_token_query(token) do
    case Base.url_decode64(token, padding: false) do
      {:ok, decoded_token} ->
        hashed_token = :crypto.hash(@hash_algorithm, decoded_token)

        query =
          from(at in AuthorToken,
            where:
              at.token == ^hashed_token and like(at.context, "collaborator_invitation:%") and
                at.inserted_at > ago(@collaborator_invitation_validity_in_days, "day")
          )

        {:ok, query}

      :error ->
        :error
    end
  end

  @doc """
  Returns the token struct for the given token value and context.
  """
  def token_and_context_query(token, context) do
    from AuthorToken, where: [token: ^token, context: ^context]
  end

  @doc """
  Gets all tokens for the given author for the given contexts.
  """
  def author_and_contexts_query(author, :all) do
    from t in AuthorToken, where: t.author_id == ^author.id
  end

  def author_and_contexts_query(author, [_ | _] = contexts) do
    from t in AuthorToken, where: t.author_id == ^author.id and t.context in ^contexts
  end
end
