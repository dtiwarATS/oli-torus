defmodule OliWeb.ProjectController do
  use OliWeb, :controller
  alias Oli.Course
  import OliWeb.ProjectPlugs

  plug :fetch_project when action not in [:create]
  plug :authorize_project when action not in [:create]

  def overview(conn, %{"project" => _project_id}) do
    params = %{title: "Overview", active: :overview}
    render %{conn | assigns: Map.merge(conn.assigns, params)}, "overview.html"
  end

  def objectives(conn, %{"project" => _project_id}) do
    render conn, "objectives.html", title: "Objectives", active: :objectives
  end

  def curriculum(conn, %{"project" => _project_id}) do
    render conn, "curriculum.html", title: "Curriculum", active: :curriculum
  end

  def publish(conn, %{"project" => _project_id}) do
    render conn, "publish.html", title: "Publish", active: :publish
  end

  def insights(conn, %{"project" => _project_id}) do
    render conn, "insights.html", title: "Insights", active: :insights
  end

  def create(conn, %{"project" => %{"title" => title} = _project_attrs}) do
      case Course.create_project(title, conn.assigns.current_author) do
        {:ok, %{project: project} = _results} ->
          redirect conn, to: Routes.project_path(conn, :overview, project)
        {:error, _failed_operation, _failed_value, _changes_before_failure} ->
          conn
            |> put_flash(:error, "Could not create project. Please try again")
            |> redirect(to: Routes.workspace_path(conn, :projects, project_title: title))
      end
  end

end
