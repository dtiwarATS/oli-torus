defmodule OliWeb.Components.Delivery.Actions do
  use OliWeb, :live_component
  use OliWeb.Common.Modal

  alias Lti_1p3.Roles.ContextRoles
  alias Oli.Accounts
  alias OliWeb.Common.Confirm
  alias Phoenix.LiveView.JS
  alias Oli.Delivery.Paywall
  alias OliWeb.Components.Modal

  @user_role_data [
    %{id: 3, name: :instructor, title: "Instructor"},
    %{id: 4, name: :student, title: "Student"}
  ]

  def update(
        %{
          user: user,
          section: section,
          enrollment_info: enrollment_info,
          is_admin: is_admin
        } = _assigns,
        socket
      ) do
    %{
      enrollment: enrollment,
      user_role_id: user_role_id,
      bypassed_by_user_id: bypassed_by_user_id,
      is_suspended?: is_suspended?
    } =
      enrollment_info

    has_payment = !is_suspended? and Paywall.has_paid?(enrollment)

    {:ok,
     assign(socket,
       enrollment: enrollment,
       section: section,
       user: user,
       user_role_id: user_role_id,
       user_role_data: @user_role_data,
       has_payment: has_payment,
       bypassed_by_user_id: bypassed_by_user_id,
       is_admin: is_admin,
       is_suspended?: is_suspended?,
       payment_status_uuid: UUID.uuid4()
     )}
  end

  attr(:enrollment_info, :map, required: true)
  attr(:section, :map, required: true)
  attr(:user, :map, required: true)

  def render(assigns) do
    ~H"""
    <div id="student_actions">
      <div id="modals">
        <Modal.modal
          id="unenroll_user_modal"
          class="w-5/6"
          on_confirm={JS.push("unenroll", target: @myself) |> Modal.hide_modal("unenroll_user_modal")}
        >
          <:title>Unenroll student</:title>
          <%= "Are you sure you want to unenroll #{@user.name} from the course #{@section.title}" %>
          <:confirm>Confirm</:confirm>
        </Modal.modal>

        <Modal.modal
          id="re_enroll_user_modal"
          class="w-5/6"
          on_confirm={
            JS.push("re_enroll", target: @myself) |> Modal.hide_modal("re_enroll_user_modal")
          }
        >
          <:title>Re-enroll student</:title>
          <%= "Are you sure you want to re-enroll #{@user.name} in the course #{@section.title}" %>
          <:confirm>Confirm</:confirm>
        </Modal.modal>

        <Modal.modal
          :if={@section.requires_payment and @is_admin}
          id="payment_status_modal"
          class="w-5/6"
          on_confirm={
            JS.push("invalidate_payment", target: @myself)
            |> Modal.hide_modal("payment_status_modal")
          }
          on_cancel={
            JS.push("force_reset_payment_status", target: @myself)
            |> Modal.hide_modal("payment_status_modal")
          }
        >
          <:title>Update payment status</:title>
          <%= "Are you sure you want to change the payment status of #{@user.name} in the course #{@section.title} to NOT PAID?" %>
          <:cancel>Cancel</:cancel>
          <:confirm>Confirm</:confirm>
        </Modal.modal>
      </div>
      <div class="mx-10 mb-10 bg-white dark:bg-gray-800 shadow-sm px-14 py-7 flex flex-col gap-6">
        <%= if @is_suspended? do %>
          <div id="unenrolled_student_actions">
            <div class="ml-auto">
              <button phx-click={Modal.show_modal("re_enroll_user_modal")} class="btn btn-primary">
                Re-enroll
              </button>
            </div>
          </div>
        <% else %>
          <div id="enrolled_student_actions" class="flex flex-col gap-6">
            <div class="flex flex-col sm:flex-row sm:items-end instructor_dashboard_table">
              <h4 class="torus-h4 !py-0 mr-auto dark:text-white">Actions</h4>
            </div>

            <div class="flex justify-between items-center">
              <div class="flex flex-col">
                <span class="dark:text-white">Change enrolled user role</span>
                <span class="text-xs text-gray-400 dark:text-gray-950">
                  Select the role to change for the user in this section.
                </span>
              </div>
              <form phx-change="display_confirm_modal" phx-target={@myself}>
                <select class="torus-select pr-32" name="filter_by_role_id">
                  <%= for elem <- @user_role_data do %>
                    <option selected={elem.id == @user_role_id} value={elem.id}>
                      <%= elem.title %>
                    </option>
                  <% end %>
                </select>
              </form>
            </div>
            <%= if @section.requires_payment and @is_admin do %>
              <div class="flex justify-between items-center">
                <div class="flex flex-col">
                  <span class="dark:text-black">Bypass payment</span>
                  <span class="text-xs text-gray-400 dark:text-gray-950">Apply bypass payment</span>
                </div>
                <button
                  class="torus-button flex justify-center primary h-9 w-48"
                  disabled={@has_payment}
                  phx-click="display_bypass_modal"
                  phx-target={@myself}
                >
                  Apply Bypass Payment
                </button>
              </div>
              <div :if={@has_payment} class="flex justify-between items-center">
                <div class="flex flex-col">
                  <span class="dark:text-white">Update payment status</span>
                </div>
                <form
                  id={"payment_status_form_#{@payment_status_uuid}"}
                  phx-change={Modal.show_modal("payment_status_modal")}
                >
                  <select class="torus-select pr-32" name="payment_status">
                    <option selected={true} value={:paid}>
                      Paid
                    </option>
                    <option selected={false} value={:unpaid}>
                      Unpaid
                    </option>
                  </select>
                </form>
              </div>
            <% end %>

            <%= if @is_admin do %>
              <.live_component
                id="transfer_enrollment"
                module={OliWeb.Delivery.Actions.TransferEnrollment}
                section={@section}
                user={@user}
              />
            <% end %>

            <div class="ml-auto">
              <button phx-click={Modal.show_modal("unenroll_user_modal")} class="btn btn-danger">
                Unenroll
              </button>
            </div>
          </div>
        <% end %>
      </div>
    </div>
    """
  end

  def handle_event("force_reset_payment_status", _params, socket) do
    {:noreply, assign(socket, payment_status_uuid: UUID.uuid4())}
  end

  def handle_event("invalidate_payment", _params, socket) do
    with {:ok, active_payment} <-
           Paywall.get_active_payment_for(socket.assigns.enrollment.id, socket.assigns.section.id),
         {:ok, _updated_payment} <-
           Paywall.update_payment(active_payment, %{
             type: :invalidated,
             invalidated_by_user_id: socket.assigns.bypassed_by_user_id
           }) do
      {:noreply, assign(socket, has_payment: false)}
    else
      _ ->
        {:noreply, put_flash(socket, :error, "Could not update payment status.")}
    end
  end

  def handle_event("unenroll", _params, socket) do
    %{section: section, user: user} = socket.assigns

    case Oli.Delivery.Sections.unenroll_learner(user.id, section.id) do
      {:ok, _} ->
        {:noreply,
         redirect(socket,
           to: ~p"/sections/#{socket.assigns.section.slug}/manage"
         )}

      _ ->
        {:noreply, socket}
    end
  end

  def handle_event("re_enroll", _params, socket) do
    %{section: section, user: user} = socket.assigns

    case Oli.Delivery.Sections.re_enroll_learner(user.id, section.id) do
      {:ok, _} ->
        {:noreply,
         redirect(socket,
           to: ~p"/sections/#{section.slug}/manage"
         )}

      {:error, :not_found} ->
        send(
          self(),
          {:put_flash, :info,
           "Could not re-enroll the student. Previous enrollment was not found."}
        )

        {:noreply, socket}
    end
  end

  # Change user role

  def handle_event(
        "change_user_role",
        %{"filter_by_role_id" => filter_by_role_id},
        socket
      ) do
    context_role =
      case String.to_integer(filter_by_role_id) do
        3 -> ContextRoles.get_role(:context_instructor)
        4 -> ContextRoles.get_role(:context_learner)
      end

    Accounts.update_user_context_role(
      socket.assigns.enrollment,
      context_role
    )

    {:noreply,
     socket
     |> assign(user_role_id: String.to_integer(filter_by_role_id))
     |> hide_modal(modal_assigns: nil)}
  end

  def handle_event("display_confirm_modal", %{"filter_by_role_id" => filter_by_role_id}, socket) do
    modal_assigns = %{
      title: "Change role",
      id: "change_role_modal",
      ok:
        JS.push("change_user_role",
          target: socket.assigns.myself,
          value: %{"filter_by_role_id" => filter_by_role_id}
        ),
      cancel:
        JS.push("cancel_confirm_modal",
          target: socket.assigns.myself,
          value: %{"previous_role_id" => socket.assigns.user_role_id}
        ),
      myself: socket.assigns.myself
    }

    modal = fn assigns ->
      assigns =
        Map.merge(assigns, %{
          given_name: socket.assigns.user.given_name,
          family_name: socket.assigns.user.family_name
        })

      ~H"""
      <Confirm.render
        title={@modal_assigns.title}
        ok={@modal_assigns.ok}
        cancel={@modal_assigns.cancel}
        id={@modal_assigns.id}
      >
        <%= "Are you sure you want to change user role to #{@given_name} #{@family_name}?" %>
      </Confirm.render>
      """
    end

    send(self(), {:show_modal, modal, modal_assigns})

    {:noreply, assign(socket, user_role_id: filter_by_role_id)}
  end

  def handle_event("cancel_confirm_modal", %{"previous_role_id" => previous_role_id}, socket) do
    send(self(), {:hide_modal})

    {:noreply, assign(socket, user_role_id: previous_role_id)}
  end

  # Bypass payment

  def handle_event(
        "bypass_payment",
        %{"bypassed_by_user_id" => bypassed_by_user_id, "enrollment_id" => enrollment_id},
        socket
      ) do
    case Paywall.create_payment(%{
           type: :bypass,
           generation_date: DateTime.utc_now(),
           application_date: DateTime.utc_now(),
           amount: Money.new(0, "USD"),
           section_id: socket.assigns.section.id,
           enrollment_id: enrollment_id,
           bypassed_by_user_id: bypassed_by_user_id
         }) do
      {:ok, _payment} ->
        {:noreply, assign(socket, has_payment: !socket.assigns.has_payment)}

      {:error, _} ->
        {:noreply, socket}
    end
  end

  def handle_event("display_bypass_modal", _params, socket) do
    modal_assigns = %{
      title: "Bypass payment",
      id: "bypass_payment_modal",
      ok:
        JS.push("bypass_payment",
          target: socket.assigns.myself,
          value: %{
            "bypassed_by_user_id" => socket.assigns.bypassed_by_user_id,
            "enrollment_id" => socket.assigns.enrollment.id
          }
        ),
      cancel:
        JS.push("cancel_confirm_modal",
          target: socket.assigns.myself
        ),
      myself: socket.assigns.myself
    }

    modal = fn assigns ->
      assigns =
        Map.merge(assigns, %{
          given_name: socket.assigns.user.given_name,
          family_name: socket.assigns.user.family_name
        })

      ~H"""
      <Confirm.render
        title={@modal_assigns.title}
        ok={@modal_assigns.ok}
        cancel={@modal_assigns.cancel}
        id={@modal_assigns.id}
      >
        <%= "Are you sure you want to bypass payment for #{@given_name} #{@family_name}?" %>
      </Confirm.render>
      """
    end

    send(self(), {:show_modal, modal, modal_assigns})
    {:noreply, socket}
  end

  def handle_event("cancel_confirm_modal", _params, socket) do
    send(self(), {:hide_modal})

    {:noreply, socket}
  end
end
