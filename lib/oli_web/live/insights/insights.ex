defmodule OliWeb.Insights do
  alias Oli.Analytics.Summary.BrowseInsights
  use OliWeb, :live_view

  import Ecto.Query

  import OliWeb.Common.Params
  import OliWeb.DelegatedEvents

  alias Oli.Delivery.Sections
  alias OliWeb.Common.MultiSelectInput
  alias OliWeb.Common.MultiSelect.Option
  alias Oli.{Accounts, Publishing}
  alias OliWeb.Common.{Breadcrumb, PagedTable, TextSearch}
  alias OliWeb.Common.Table.SortableTableModel
  alias Oli.Repo.{Paging, Sorting}
  alias Oli.Authoring.Course
  alias OliWeb.Common.Breadcrumb
  alias Oli.Analytics.Summary.BrowseInsights
  alias Oli.Analytics.Summary.BrowseInsightsOptions
  alias OliWeb.Insights.ActivityTableModel
  alias OliWeb.Insights.PageTableModel
  alias OliWeb.Insights.ObjectiveTableModel

  @limit 25

  on_mount {OliWeb.AuthorAuth, :ensure_authenticated}
  on_mount OliWeb.LiveSessionPlugs.SetCtx

  def mount(%{"project_id" => project_slug}, _session, socket) do
    ctx = socket.assigns.ctx

    project = Course.get_project_by_slug(project_slug)

    {sections, products} =
      Sections.get_sections_containing_resources_of_given_project(project.id)
      |> Enum.reduce({[], []}, fn section, {sections, products} ->
        if section.type == :blueprint do
          {sections, [%Option{id: section.id, name: section.title} | products]}
        else
          {[%Option{id: section.id, name: section.title} | sections], products}
        end
      end)

    sections_by_product_id = get_sections_by_product_id(project.id)

    activity_type_id = Oli.Resources.ResourceType.get_id_by_type("activity")

    options = %BrowseInsightsOptions{
      project_id: project.id,
      resource_type_id: activity_type_id,
      section_ids: []
    }

    insights =
      BrowseInsights.browse_insights(
        %Paging{offset: 0, limit: @limit},
        %Sorting{direction: :desc, field: :first_attempt_correct},
        options
      )

    latest_publication = Publishing.get_latest_published_publication_by_slug(project.slug)

    parent_pages = parent_pages(project.slug)

    activity_types_map =
      Oli.Activities.list_activity_registrations()
      |> Enum.reduce(%{}, fn a, m -> Map.put(m, a.id, a) end)

    total_count = determine_total(insights)

    {:ok, table_model} =
      ActivityTableModel.new(insights, activity_types_map, parent_pages, project.slug, ctx)

    {:ok,
     assign(socket,
       breadcrumbs: [Breadcrumb.new(%{full_title: "Insights"})],
       active: :insights,
       sections_by_product_id: sections_by_product_id,
       is_admin?: Accounts.is_admin?(ctx.author),
       project: project,
       parent_pages: parent_pages,
       selected: :by_activity,
       latest_publication: latest_publication,
       products: products,
       sections: sections,
       is_product: false,
       section_ids: [],
       product_ids: [],
       form_uuid_for_product: "",
       form_uuid_for_section: "",
       table_model: table_model,
       options: options,
       offset: 0,
       total_count: total_count,
       active_rows: insights,
       query: "",
       limit: @limit
     )}
  end

  # Runs a query to find all sections for this project which have a
  # product associated with them. (blueprint_id)
  defp get_sections_by_product_id(project_id) do
    query =
      from s in Oli.Delivery.Sections.Section,
        where:
          s.base_project_id == ^project_id and not is_nil(s.blueprint_id) and
            s.type == :enrollable,
        select: {s.id, s.blueprint_id}

    Oli.Repo.all(query)
    |> Enum.reduce(%{}, fn {id, blueprint_id}, m ->
      case Map.get(m, blueprint_id) do
        nil -> Map.put(m, blueprint_id, [id])
        ids -> Map.put(m, blueprint_id, [id | ids])
      end
    end)
  end

  defp determine_total(items) do
    case items do
      [] -> 0
      [hd | _] -> hd.total_count
    end
  end

  def handle_params(params, _, socket) do
    table_model = SortableTableModel.update_from_params(socket.assigns.table_model, params)

    offset = get_int_param(params, "offset", 0)

    options = socket.assigns.options

    insights =
      BrowseInsights.browse_insights(
        %Paging{offset: offset, limit: @limit},
        %Sorting{direction: table_model.sort_order, field: table_model.sort_by_spec.name},
        options
      )

    table_model = Map.put(table_model, :rows, insights)
    total_count = determine_total(insights)

    {:noreply,
     assign(socket,
       offset: offset,
       table_model: table_model,
       total_count: total_count,
       options: options
     )}
  end

  defp parent_pages(project_slug) do
    publication = Oli.Publishing.project_working_publication(project_slug)
    Oli.Publishing.determine_parent_pages(publication.id)
  end

  def render(assigns) do
    ~H"""
    <div class="mb-3">
      <p>
        Insights can help you improve your course by providing a statistical analysis of
        the skills covered by each question to find areas where students are struggling.
      </p>
    </div>
    <ul class="nav nav-pills">
      <li class="nav-item my-2 mr-2">
        <button
          {is_disabled(@selected, :by_activity)}
          class="btn btn-primary"
          phx-click="filter_by_activity"
        >
          <%= if is_loading?(assigns) and @selected == :by_activity do %>
            <span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
          <% end %>
          By Activity
        </button>
      </li>
      <li class="nav-item my-2 mr-2">
        <button {is_disabled(@selected, :by_page)} class="btn btn-primary" phx-click="filter_by_page">
          <%= if is_loading?(assigns) and @selected == :by_page do %>
            <span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
          <% end %>
          By Page
        </button>
      </li>

      <li class="nav-item my-2 mr-2">
        <button
          {is_disabled(@selected, :by_objective)}
          class="btn btn-primary"
          phx-click="filter_by_objective"
        >
          <%= if is_loading?(assigns) and @selected == :by_objective do %>
            <span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
          <% end %>
          By Objective
        </button>
      </li>

      <li class="nav-item my-2 mr-2 ">
        <div class="flex gap-10">
          <.live_component
            id="sections"
            module={MultiSelectInput}
            options={@sections}
            disabled={@sections == []}
            on_select_message="section_selected"
            placeholder="Select a section"
            uuid={@form_uuid_for_section}
          />
          <.live_component
            id="products"
            module={MultiSelectInput}
            options={@products}
            disabled={@products == []}
            on_select_message="product_selected"
            placeholder="Select a product"
            uuid={@form_uuid_for_product}
          />
        </div>
      </li>
    </ul>

    <div class="card">
      <div class="card-header">
        <form phx-change="text_search_change">
          <input
            type="text"
            class="form-control"
            name="value"
            value={@query}
            placeholder="Search by title..."
          />
        </form>
      </div>
      <div class="card-body">
        <h5 class="card-title">
          Viewing analytics by <%= case @selected do
            :by_page -> "page"
            :by_activity -> "activity"
            :by_objective -> "objective"
            _ -> "activity"
          end %>
        </h5>

        <PagedTable.render
          filter={@query}
          table_model={@table_model}
          total_count={@total_count}
          offset={@offset}
          limit={@limit}
        />
      </div>
    </div>
    """
  end

  defp is_loading?(assigns) do
    is_nil(assigns.active_rows)
  end

  def patch_with(socket, changes) do
    # convert param keys from atoms to strings
    changes = Enum.into(changes, %{}, fn {k, v} -> {Atom.to_string(k), v} end)
    # convert atom values to string values
    changes =
      Enum.into(changes, %{}, fn {k, v} ->
        case v do
          atom when is_atom(atom) -> {k, Atom.to_string(v)}
          _ -> {k, v}
        end
      end)

    table_model = SortableTableModel.update_from_params(socket.assigns.table_model, changes)

    options = Map.put(socket.assigns.options, :text_search, Map.get(changes, "text_search", ""))
    offset = get_param(changes, "offset", 0)

    insights =
      BrowseInsights.browse_insights(
        %Paging{offset: offset, limit: @limit},
        %Sorting{direction: table_model.sort_order, field: table_model.sort_by_spec.name},
        options
      )

    table_model = Map.put(table_model, :rows, insights)
    total_count = determine_total(insights)

    {:noreply,
     assign(socket,
       offset: offset,
       table_model: table_model,
       total_count: total_count,
       options: options
     )}
  end

  defp filter_by(socket, resource_type_id, by_type, table_model) do
    options = %BrowseInsightsOptions{
      project_id: socket.assigns.options.project_id,
      resource_type_id: resource_type_id,
      section_ids: socket.assigns.options.section_ids
    }

    insights =
      BrowseInsights.browse_insights(
        %Paging{offset: 0, limit: @limit},
        %Sorting{direction: table_model.sort_order, field: table_model.sort_by_spec.name},
        options
      )

    table_model = Map.put(table_model, :rows, insights)
    total_count = determine_total(insights)

    {:noreply,
     assign(socket,
       offset: 0,
       table_model: table_model,
       total_count: total_count,
       options: options,
       selected: by_type
     )}
  end

  defp change_section_ids(socket, section_ids) do
    options = %BrowseInsightsOptions{socket.assigns.options | section_ids: section_ids}
    table_model = socket.assigns.table_model

    insights =
      BrowseInsights.browse_insights(
        %Paging{offset: 0, limit: @limit},
        %Sorting{direction: table_model.sort_order, field: table_model.sort_by_spec.name},
        options
      )

    table_model = Map.put(table_model, :rows, insights)
    total_count = determine_total(insights)

    {:noreply,
     assign(socket,
       offset: 0,
       table_model: table_model,
       total_count: total_count,
       options: options
     )}
  end

  def handle_event("filter_by_activity", _params, socket) do
    activity_types_map =
      Oli.Activities.list_activity_registrations()
      |> Enum.reduce(%{}, fn a, m -> Map.put(m, a.id, a) end)

    {:ok, table_model} =
      ActivityTableModel.new(
        [],
        activity_types_map,
        socket.assigns.parent_pages,
        socket.assigns.project.slug,
        socket.assigns.ctx
      )

    filter_by(
      socket,
      Oli.Resources.ResourceType.get_id_by_type("activity"),
      :by_activity,
      table_model
    )
  end

  def handle_event("filter_by_page", _params, socket) do
    {:ok, table_model} = PageTableModel.new([], socket.assigns.project.slug, socket.assigns.ctx)
    filter_by(socket, Oli.Resources.ResourceType.get_id_by_type("page"), :by_page, table_model)
  end

  def handle_event("filter_by_objective", _params, socket) do
    {:ok, table_model} = ObjectiveTableModel.new([], socket.assigns.ctx)

    filter_by(
      socket,
      Oli.Resources.ResourceType.get_id_by_type("objective"),
      :by_objective,
      table_model
    )
  end

  def handle_event(event, params, socket) do
    delegate_to(
      {event, params, socket, &OliWeb.Insights.patch_with/2},
      [&TextSearch.handle_delegated/4, &PagedTable.handle_delegated/4]
    )
  end

  def handle_info({:option_selected, "section_selected", selected_ids}, socket) do
    socket =
      assign(socket,
        section_ids: selected_ids,
        form_uuid_for_product: generate_uuid(),
        product_ids: [],
        is_product: false
      )

    change_section_ids(socket, selected_ids)
  end

  def handle_info({:option_selected, "product_selected", selected_ids}, socket) do
    socket =
      assign(socket,
        product_ids: selected_ids,
        form_uuid_for_section: generate_uuid(),
        section_ids: [],
        is_product: true
      )

    section_ids =
      Enum.reduce(selected_ids, MapSet.new(), fn id, all ->
        Map.get(socket.assigns.sections_by_product_id, id)
        |> MapSet.new()
        |> MapSet.union(all)
      end)
      |> Enum.to_list()

    change_section_ids(socket, section_ids)
  end

  defp generate_uuid do
    UUID.uuid4()
  end

  defp is_disabled(selected, title) do
    if selected == title do
      [disabled: true]
    else
      []
    end
  end
end
