defmodule OliWeb.Workspace.Instructor do
  use OliWeb, :live_view

  alias Oli.Delivery.Sections
  alias OliWeb.Backgrounds
  alias OliWeb.Common.{Params, SearchInput}
  alias OliWeb.Components.Delivery.Utils
  alias OliWeb.Icons

  import Ecto.Query, warn: false
  import OliWeb.Common.SourceImage

  @default_params %{
    text_search: "",
    sidebar_expanded: true
  }

  @impl Phoenix.LiveView
  def mount(params, _session, socket) do
    sections =
      Sections.list_user_open_and_free_sections(socket.assigns.current_user)
      |> add_user_role(socket.assigns.current_user)
      |> add_instructors()
      |> filter_by_role(:instructor)

    {:ok,
     assign(socket,
       sections: sections,
       params: decode_params(params),
       filtered_sections: sections,
       active_workspace: :instructor
     )}
  end

  @impl Phoenix.LiveView
  def handle_params(params, _uri, socket) do
    %{sections: sections} = socket.assigns
    params = decode_params(params)

    {:noreply,
     assign(socket,
       filtered_sections: maybe_filter_by_text(sections, params.text_search),
       params: params
     )}
  end

  @impl Phoenix.LiveView

  def render(assigns) do
    ~H"""
    <div class="dark:bg-[#0F0D0F] bg-[#F3F4F8]">
      <div class="relative flex items-center h-[247px]">
        <div class="absolute top-0 h-full w-full">
          <Backgrounds.instructor_dashboard_header />
        </div>
        <div class="flex-col justify-start items-start gap-[15px] z-10 px-[63px] font-['Open Sans']">
          <div class="flex flex-row items-center gap-3">
            <Icons.growing_bars
              stroke_class="stroke-[#353740] dark:stroke-white"
              width={36}
              height={36}
            />
            <h1 class="text-[#353740] dark:text-white text-[32px] font-bold leading-normal">
              Instructor Dashboard
            </h1>
          </div>
          <h2 class="text-[#353740] dark:text-white text-base font-normal leading-normal">
            Gain insights into student engagement, progress, and learning patterns.
          </h2>
        </div>
      </div>

      <div class="flex flex-col items-start mt-[40px] gap-9 py-[60px] px-[63px]">
        <div class="flex flex-col gap-4">
          <h3 class="dark:text-violet-100 text-xl font-bold font-['Open Sans'] leading-normal whitespace-nowrap">
            My courses
          </h3>
          <div
            :if={!is_independent_instructor?(@current_user)}
            role="create section instructions"
            class="dark:text-violet-100 text-base font-normal font-['Inter'] leading-normal"
          >
            To create course sections,
            <button
              onclick="window.showHelpModal();"
              class="text-blue-400 text-base font-bold font-['Open Sans'] tracking-tight cursor-pointer"
            >
              contact support.
            </button>
          </div>
        </div>
        <div class="flex items-center w-full gap-3">
          <.link
            href={if(is_independent_instructor?(@current_user), do: ~p"/sections/independent/create")}
            class={[
              "h-12 px-5 py-3 hover:no-underline rounded-md justify-center items-center gap-2 inline-flex",
              if(is_independent_instructor?(@current_user),
                do: "bg-[#0080FF] hover:bg-[#0075EB] dark:bg-[#0062F2] dark:hover:bg-[#0D70FF]",
                else: "bg-zinc-600 cursor-not-allowed"
              )
            ]}
          >
            <div class="w-3 h-5 relative">
              <div class="w-5 h-5 left-[-8px] top-0 absolute text-white"><Icons.plus /></div>
            </div>
            <div class="text-white text-base font-normal font-['Inter'] leading-normal whitespace-nowrap">
              Create New Section
            </div>
          </.link>
          <.form for={%{}} phx-change="search_section" class="w-[330px]">
            <SearchInput.render
              id="section_search_input"
              name="text_search"
              placeholder="Search my courses..."
              text={@params.text_search}
            />
          </.form>
        </div>

        <div class="flex w-full mb-10">
          <%= if length(@sections) == 0 do %>
            <p>You are not enrolled in any courses as an instructor.</p>
          <% else %>
            <div class="flex flex-wrap w-full gap-3">
              <.course_card
                :for={{section, index} <- Enum.with_index(@filtered_sections)}
                index={index}
                section={section}
                params={@params}
              />
              <p :if={length(@filtered_sections) == 0} class="mt-4">
                No course found matching <strong>"<%= @params.text_search %>"</strong>
              </p>
            </div>
          <% end %>
        </div>
      </div>
    </div>
    """
  end

  attr :section, :map
  attr :index, :integer
  attr :params, :map

  def course_card(assigns) do
    ~H"""
    <div
      id={"course_card_#{@section.id}"}
      phx-mounted={
        JS.transition(
          {"ease-out duration-300", "opacity-0 -translate-x-1/2", "opacity-100 translate-x-0"},
          time: 300 + @index * 60
        )
      }
      class="opacity-0 flex flex-col w-96 h-[500px] rounded-lg border-2 border-gray-700 transition-all overflow-hidden bg-white"
    >
      <div
        class="w-96 h-[220px] bg-cover border-b-2 border-gray-700"
        style={"background-image: url('#{cover_image(@section)}');"}
      >
      </div>
      <div class="flex-col justify-start items-start gap-6 inline-flex p-8">
        <h5
          class="text-black text-base font-bold font-['Inter'] leading-normal overflow-hidden"
          style="display: -webkit-box; -webkit-line-clamp: 1; -webkit-box-orient: vertical;"
          role="course title"
        >
          <%= @section.title %>
        </h5>
        <div class="text-black text-base font-normal leading-normal h-[100px] overflow-hidden">
          <p
            role="course description"
            style="display: -webkit-box; -webkit-line-clamp: 4; -webkit-box-orient: vertical;"
          >
            <%= @section.description %>
          </p>
        </div>
        <div class="self-stretch justify-end items-start gap-4 inline-flex">
          <.link
            href={get_course_url(@section, @params.sidebar_expanded)}
            class="px-5 py-3 bg-[#0080FF] hover:bg-[#0075EB] dark:bg-[#0062F2] dark:hover:bg-[#0D70FF] hover:no-underline rounded-md justify-center items-center gap-2 flex text-white text-base font-normal leading-normal"
          >
            <div class="text-white text-base font-normal font-['Inter'] leading-normal whitespace-nowrap">
              View Course
            </div>
          </.link>
        </div>
      </div>
    </div>
    """
  end

  @impl Phoenix.LiveView
  def handle_event("search_section", %{"text_search" => text_search}, socket) do
    {:noreply,
     push_patch(socket,
       to:
         ~p"/sections/workspace/instructor?#{%{socket.assigns.params | text_search: text_search}}"
     )}
  end

  defp add_user_role([], _user), do: []

  defp add_user_role(sections, user) do
    sections
    |> Enum.map(fn s ->
      Map.merge(s, %{user_role: Utils.user_role(s, user) |> Atom.to_string()})
    end)
  end

  defp add_instructors([]), do: []

  defp add_instructors(sections) do
    instructors_per_section = Sections.instructors_per_section(Enum.map(sections, & &1.id))

    sections
    |> Enum.map(fn section ->
      Map.merge(section, %{instructors: Map.get(instructors_per_section, section.id, [])})
    end)
  end

  defp filter_by_role(sections, :instructor),
    do: Enum.filter(sections, fn s -> s.user_role == "instructor" end)

  defp maybe_filter_by_text(sections, nil), do: sections
  defp maybe_filter_by_text(sections, ""), do: sections

  defp maybe_filter_by_text(sections, text_search) do
    normalized_text_search = String.downcase(text_search)

    sections
    |> Enum.filter(fn section ->
      # searchs by course name or instructor name

      String.contains?(String.downcase(section.title), normalized_text_search) ||
        Enum.find(section.instructors, false, fn name ->
          String.contains?(
            String.downcase(name),
            normalized_text_search
          )
        end)
    end)
  end

  defp get_course_url(%{user_role: "student", slug: slug}, sidebar_expanded),
    do: ~p"/sections/#{slug}?#{%{sidebar_expanded: sidebar_expanded}}"

  defp get_course_url(%{slug: slug}, sidebar_expanded),
    do: ~p"/sections/#{slug}/instructor_dashboard/manage?#{%{sidebar_expanded: sidebar_expanded}}"

  defp decode_params(params) do
    %{
      text_search: Params.get_param(params, "text_search", @default_params.text_search),
      sidebar_expanded:
        Params.get_boolean_param(params, "sidebar_expanded", @default_params.sidebar_expanded)
    }
  end
end
