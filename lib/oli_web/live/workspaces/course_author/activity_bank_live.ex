defmodule OliWeb.Workspaces.CourseAuthor.ActivityBankLive do
  use OliWeb, :live_view

  @impl Phoenix.LiveView
  def mount(_params, _session, socket) do
    project = socket.assigns.project

    {:ok,
     assign(socket,
       resource_slug: project.slug,
       resource_title: project.title,
       active_workspace: :course_author,
       active_view: :activity_bank
     )}
  end

  @impl Phoenix.LiveView
  def handle_params(_params, _url, socket) do
    {:noreply, socket}
  end

  @impl Phoenix.LiveView
  def render(assigns) do
    ~H"""
    <h1 class="flex flex-col w-full h-screen items-center justify-center">
      Placeholder for Activity Bank
    </h1>
    """
  end
end