defmodule Oli.Repo.Migrations.AddLti13RegistrationTable do
  use Ecto.Migration

  def change do
    create table(:lti_1_3_registrations) do
      add :issuer, :string
      add :client_id, :string
      add :key_set_url, :string
      add :auth_token_url, :string
      add :auth_login_url, :string
      add :auth_server, :string
      add :tool_private_key, :string
      add :kid, :string

      timestamps(type: :timestamptz)
    end

    create table(:lti_1_3_deployments) do
      add :deployment_id, :string
      add :registration_id, :string
      add :author_id, references(:authors)

      timestamps(type: :timestamptz)
    end

  end
end
