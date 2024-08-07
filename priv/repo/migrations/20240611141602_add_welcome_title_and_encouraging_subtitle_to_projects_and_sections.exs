defmodule Oli.Repo.Migrations.AddWelcomeTitleAndEncouragingSubtitleToProjects do
  use Ecto.Migration

  def change do
    alter table(:projects) do
      add(:welcome_title, :map)
      add(:encouraging_subtitle, :text)
    end

    alter table(:sections) do
      add(:welcome_title, :map)
      add(:encouraging_subtitle, :text)
    end
  end
end
