defmodule Oli.Repo.Migrations.CreateCertificatesTables do
  use Ecto.Migration

  def change do
    execute_types()

    create table(:certificates) do
      add :required_discussion_posts, :integer
      add :required_class_notes, :integer
      add :min_percentage_for_completion, :float
      add :min_percentage_for_distinction, :float
      add :assessments_apply_to, :certificates_assessments_apply_to, default: "all"
      add :custom_assessments, {:array, :integer}, default: []
      add :requires_instructor_approval, :boolean, default: false

      add :title, :string
      add :description, :string

      add :admin_name1, :string
      add :admin_title1, :string
      add :admin_name2, :string
      add :admin_title2, :string
      add :admin_name3, :string
      add :admin_title3, :string

      add :logo1, :string
      add :logo2, :string
      add :logo3, :string

      add :section_id, references(:sections, on_delete: :delete_all), null: false

      timestamps(type: :utc_datetime)
    end

    create table(:granted_certificates) do
      add :state, :granted_certificates_state
      add :with_distinction, :boolean
      add :guid, :string
      add :issued_by, :integer, allow_nil: true
      add :issued_by_type, :granted_certificates_issued_by_type
      add :issued_at, :utc_datetime, allow_nil: true

      add :certificate_id, references(:certificates)
      add :user_id, references(:users)

      timestamps(type: :utc_datetime)
    end

    create unique_index(:granted_certificates, [:user_id, :certificate_id],
             name: :unique_user_certificate
           )

    alter table(:sections) do
      add :certificate_enabled, :boolean, default: false
    end
  end

  defp execute_types() do
    execute(
      "CREATE TYPE public.certificates_assessments_apply_to AS ENUM ('all', 'custom');",
      "DROP TYPE public.certificates_assessments_apply_to;"
    )

    execute(
      "CREATE TYPE public.granted_certificates_issued_by_type AS ENUM ('user', 'autor');",
      "DROP TYPE public.granted_certificates_issued_by_type;"
    )

    execute(
      "CREATE TYPE public.granted_certificates_state AS ENUM ('pending', 'earned', 'denied');",
      "DROP TYPE public.granted_certificates_state;"
    )
  end
end
