defmodule Oli.Analytics.XAPI.Events.Video.Seeked do
  alias Oli.Analytics.XAPI.Events.Context

  def new(
        %Context{
          user_id: user_id,
          host_name: host_name,
          section_id: section_id,
          project_id: project_id,
          publication_id: publication_id
        },
        %{
          attempt_guid: page_attempt_guid,
          attempt_number: page_attempt_number,
          resource_id: page_id,
          timestamp: timestamp,
          video_url: video_url,
          video_title: video_title,
          video_seek_from: from,
          video_seek_to: to,
          content_element_id: content_element_id
        }
      ) do
    %{
      "actor" => %{
        "account" => %{
          "homePage" => host_name,
          "name" => user_id
        },
        "objectType" => "Agent"
      },
      "verb" => %{
        "id" => "https://w3id.org/xapi/video/verbs/seeked",
        "display" => %{
          "en-US" => "seeked"
        }
      },
      "object" => %{
        "id" => video_url,
        "definition" => %{
          "name" => %{
            "en-US" => video_title
          },
          "type" => "https://w3id.org/xapi/video/activity-type/video"
        },
        "objectType" => "Activity"
      },
      "result" => %{
        "extensions" => %{
          "https://w3id.org/xapi/video/extensions/time-to" => to,
          "https://w3id.org/xapi/video/extensions/time-from" => from
        }
      },
      "context" => %{
        "contextActivities" => %{
          "category" => [%{"id" => "https://w3id.org/xapi/video"}]
        },
        "extensions" => %{
          "http://oli.cmu.edu/extensions/page_attempt_number" => page_attempt_number,
          "http://oli.cmu.edu/extensions/page_attempt_guid" => page_attempt_guid,
          "http://oli.cmu.edu/extensions/section_id" => section_id,
          "http://oli.cmu.edu/extensions/project_id" => project_id,
          "http://oli.cmu.edu/extensions/publication_id" => publication_id,
          "http://oli.cmu.edu/extensions/resource_id" => page_id,
          "http://oli.cmu.edu/extensions/content_element_id" => content_element_id
        }
      },
      "timestamp" => timestamp,
      "registration" => "#{section_id}-#{page_id}-#{content_element_id}"
    }
  end
end
