defmodule OliWeb.Products.PaymentsView do
  use OliWeb, :live_view
  use OliWeb.Common.SortableTable.TableHandlers

  alias OliWeb.Common.Filter
  alias OliWeb.Common.Listing
  alias OliWeb.Common.Breadcrumb
  alias OliWeb.Products.Payments.CreateCodes
  alias OliWeb.Common.Table.SortableTableModel
  alias OliWeb.Router.Helpers, as: Routes
  alias OliWeb.Common.SessionContext

  @table_filter_fn &OliWeb.Products.PaymentsView.filter_rows/3
  @table_push_patch_path &OliWeb.Products.PaymentsView.live_path/2

  def filter_rows(socket, query, _filter) do
    case String.downcase(query) do
      "" ->
        socket.assigns.payments

      str ->
        Enum.filter(socket.assigns.payments, fn p ->
          title =
            case is_nil(p.section) do
              true -> ""
              false -> p.section.title
            end

          String.contains?(String.downcase(p.code), str) or
            String.contains?(String.downcase(title), str)
        end)
    end
  end

  def live_path(socket, params) do
    Routes.live_path(socket, OliWeb.Products.PaymentsView, socket.assigns.product_slug, params)
  end

  def mount(%{"product_id" => product_slug}, session, socket) do
    ctx = SessionContext.init(socket, session)

    payments = list_payments(product_slug)

    total_count = length(payments)

    {:ok, table_model} = OliWeb.Products.Payments.TableModel.new(payments, ctx)

    {:ok,
     assign(socket,
       ctx: ctx,
       product: Oli.Delivery.Sections.get_section_by(slug: product_slug),
       product_slug: product_slug,
       payments: payments,
       total_count: total_count,
       table_model: table_model,
       breadcrumbs: [Breadcrumb.new(%{full_title: "Payments"})],
       title: "Payments",
       code_count: 50,
       offset: 0,
       limit: 20,
       applied_query: "",
       download_enabled: false
     )}
  end

  def render(assigns) do
    ~H"""
    <div>
      <CreateCodes.render
        disabled={!@product.requires_payment}
        count={@code_count}
        product_slug={@product_slug}
        download_enabled={@download_enabled}
        create_codes="create"
        change="change_count"
      />

      <hr class="mt-5 mb-5" />

      <Filter.render apply="apply_search" change="change_search" reset="reset_search" />

      <div class="mb-3" />

      <Listing.render
        filter={@applied_query}
        table_model={@table_model}
        total_count={@total_count}
        offset={@offset}
        limit={@limit}
        sort="sort"
        page_change="page_change"
      />
    </div>
    """
  end

  defp list_payments(product_slug) do
    Oli.Delivery.Paywall.list_payments(product_slug)
    |> Enum.map(fn element ->
      Map.put(
        element,
        :code,
        if is_nil(element.payment.code) do
          ""
        else
          Oli.Delivery.Paywall.Payment.to_human_readable(element.payment.code)
        end
      )
      |> Map.put(:unique_id, element.payment.id)
    end)
  end

  def handle_event("create", _, socket) do
    create_payment_codes =
      Oli.Delivery.Paywall.create_payment_codes(
        socket.assigns.product_slug,
        socket.assigns.code_count
      )

    case create_payment_codes do
      {:ok, _} ->
        payments = list_payments(socket.assigns.product_slug)

        {:ok, table_model} =
          OliWeb.Products.Payments.TableModel.new(
            payments,
            socket.assigns.ctx
          )

        total_count = length(payments)

        {:noreply,
         socket
         |> put_flash(:info, "Payment codes successfully added.")
         |> assign(
           payments: payments,
           total_count: total_count,
           table_model: table_model,
           download_enabled: true
         )}

      _ ->
        {:noreply,
         socket
         |> put_flash(:error, "Code payments couldn't be added.")}
    end
  end

  def handle_event("change_count", %{"value" => count}, socket) do
    count =
      case String.to_integer(count) do
        i when i > 0 -> i
        _ -> 1
      end

    {:noreply, assign(socket, code_count: count, download_enabled: false)}
  end
end
