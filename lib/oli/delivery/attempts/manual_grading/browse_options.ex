defmodule Oli.Delivery.Attempts.ManualGrading.BrowseOptions do
  @moduledoc """
  Params for manual graded activity attempt browse queries.
  """

  @enforce_keys [
    :user_id,
    :activity_id,
    :page_id,
    :graded,
    :lifecycle_state,
    :text_search
  ]

  defstruct [
    # Filter attempts for a specific user id
    :user_id,
    # Filter attempts for a specific activity resource id
    :activity_id,
    # Filter attempts for a specific page resource id
    :page_id,
    # Filter attempts for graded, ungraded attempts (nil shows all)
    :graded,
    # Filter attempts for manually graded status (nil shows all)
    :lifecycle_state,
    # Text search across user, page, and activity information
    :text_search
  ]

  @type t() :: %__MODULE__{
          user_id: integer(),
          activity_id: integer(),
          page_id: integer(),
          graded: boolean(),
          lifecycle_state: integer(),
          text_search: String.t()
        }
end
