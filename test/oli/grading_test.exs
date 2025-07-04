defmodule Oli.GradingTest do
  use Oli.DataCase

  alias Oli.Grading
  alias Oli.Publishing

  describe "grading" do
    defp set_resources_as_graded(%{revision1: revision1, revision2: revision2} = map) do
      {:ok, revision1} = Oli.Resources.update_revision(revision1, %{graded: true})
      {:ok, revision2} = Oli.Resources.update_revision(revision2, %{graded: true})
      map = put_in(map.revision1, revision1)
      map = put_in(map.revision2, revision2)

      map
    end

    defp create_activity(
           %{
             project: project,
             revision2: revision2,
             page2: page2
           } = map
         ) do
      working_pub = Publishing.project_working_publication(project.slug)
      map = Map.put(map, :publication, working_pub)

      activity_content = %{
        "stem" => "1",
        "authoring" => %{
          "parts" => [
            %{
              "id" => "1",
              "responses" => [
                %{
                  "rule" => "input like {a}",
                  "score" => 10,
                  "id" => "r1",
                  "feedback" => %{"id" => "1", "content" => "yes"}
                },
                %{
                  "rule" => "input like {b}",
                  "score" => 1,
                  "id" => "r2",
                  "feedback" => %{"id" => "2", "content" => "almost"}
                },
                %{
                  "rule" => "input like {c}",
                  "score" => 0,
                  "id" => "r3",
                  "feedback" => %{"id" => "3", "content" => "no"}
                }
              ],
              "scoringStrategy" => "best",
              "evaluationStrategy" => "regex"
            }
          ]
        }
      }

      map =
        Oli.Seeder.add_activity(
          map,
          %{title: "activity one", max_attempts: 2, content: activity_content},
          :activity
        )

      %{resource: resource, revision: _revision} =
        Seeder.create_activity(
          %{
            scope: :banked,
            objectives: %{"1" => [1]},
            title: "5",
            content: %{model: %{stem: "this is the question"}}
          },
          map.publication,
          map.project,
          map.author
        )

      page2_changes = %{
        "content" => %{
          "model" => [
            %{
              "type" => "content",
              "children" => [%{"type" => "p", "children" => [%{"text" => "SECOND"}]}]
            },
            %{
              "type" => "activity-reference",
              "activity_id" => Map.get(map, :activity).revision.resource_id
            },
            %{
              "id" => resource.id,
              "type" => "selection",
              "count" => 1,
              "logic" => %{
                "conditions" => nil
              }
            }
          ]
        }
      }

      revision2 = Oli.Seeder.revise_page(page2_changes, page2, revision2, working_pub)

      {:ok, latest_publication} =
        Publishing.publish_project(project, "some changes", map.author.id)

      map = Map.put(map, :publication, latest_publication)

      map = put_in(map.revision2, revision2)

      map
    end

    setup do
      Oli.Seeder.base_project_with_resource2()
      |> set_resources_as_graded
      |> create_activity()
      |> Oli.Seeder.create_section()
      |> Oli.Seeder.create_section_resources()
      |> Oli.Seeder.add_users_to_section(:section, [:user1, :user2, :user3])
      |> Oli.Seeder.add_resource_accesses(:section, %{
        revision1: %{
          out_of: 20,
          scores: %{
            user1: 12,
            user2: 20,
            user3: 19
          }
        },
        revision2: %{
          out_of: 5,
          scores: %{
            user1: 0,
            user2: 3,
            user3: 5
          }
        }
      })
    end

    test "determine_page_out_of/2 correctly determines the adaptive max out of", %{
      section: section,
      revision1: r
    } do
      r = %{
        r
        | content: %{
            "advancedDelivery" => true
          }
      }

      assert Grading.determine_page_out_of(section.slug, r) == 1.0

      r = %{
        r
        | content: %{
            "advancedDelivery" => true,
            "custom" => %{}
          }
      }

      assert Grading.determine_page_out_of(section.slug, r) == 1.0

      r = %{
        r
        | content: %{
            "advancedDelivery" => true,
            "custom" => %{"totalScore" => "2.0"}
          }
      }

      assert Grading.determine_page_out_of(section.slug, r) == 2.0

      r = %{
        r
        | content: %{
            "advancedDelivery" => true,
            "custom" => %{"totalScore" => "not a number"}
          }
      }

      assert Grading.determine_page_out_of(section.slug, r) == 1.0

      r = %{
        r
        | content: %{
            "advancedDelivery" => true,
            "custom" => %{"totalScore" => 5}
          }
      }

      assert Grading.determine_page_out_of(section.slug, r) == 5

      r = %{
        r
        | content: %{
            "advancedDelivery" => true,
            "custom" => %{"totalScore" => 5.4}
          }
      }

      assert Grading.determine_page_out_of(section.slug, r) == 5.4

      r = %{
        r
        | content: %{
            "advancedDelivery" => true,
            "custom" => %{"totalScore" => %{"something" => "else"}}
          }
      }

      assert Grading.determine_page_out_of(section.slug, r) == 1.0

      r = %{
        r
        | content: %{
            "advancedDelivery" => true,
            "custom" => %{"totalScore" => 0.0}
          }
      }

      assert Grading.determine_page_out_of(section.slug, r) == 1.0
    end

    test "determine_page_out_of/2 correctly determines max out of for non-adaptive pages",
         %{
           section: section,
           revision2: revision2
         } do
      assert Grading.determine_page_out_of(section.slug, revision2) == 11
    end

    test "returns valid gradebook for section", %{
      section: section,
      revision1: revision1,
      revision2: revision2,
      user1: user1,
      user2: user2,
      user3: user3,
      user1_enrollment: user1_enrollment,
      user2_enrollment: user2_enrollment,
      user3_enrollment: user3_enrollment
    } do
      {gradebook, columns} = Grading.generate_gradebook_for_section(section)

      expected_gradebook =
        [
          %Grading.GradebookRow{
            scores: [
              %Grading.GradebookScore{
                label: "Page one",
                out_of: 20,
                resource_id: revision1.resource_id,
                score: 12,
                was_late: false
              },
              %Grading.GradebookScore{
                label: "Page two",
                out_of: 5,
                resource_id: revision2.resource_id,
                score: 0,
                was_late: false
              }
            ],
            user:
              Map.merge(user1, %{
                enrollment_status: :enrolled,
                enrollment_date: user1_enrollment.inserted_at,
                total_count: 3
              })
          },
          %Grading.GradebookRow{
            scores: [
              %Grading.GradebookScore{
                label: "Page one",
                out_of: 20,
                resource_id: revision1.resource_id,
                score: 20,
                was_late: false
              },
              %Grading.GradebookScore{
                label: "Page two",
                out_of: 5,
                resource_id: revision2.resource_id,
                score: 3,
                was_late: false
              }
            ],
            user:
              Map.merge(user2, %{
                enrollment_status: :enrolled,
                enrollment_date: user2_enrollment.inserted_at,
                total_count: 3
              })
          },
          %Grading.GradebookRow{
            scores: [
              %Grading.GradebookScore{
                label: "Page one",
                out_of: 20,
                resource_id: revision1.resource_id,
                score: 19,
                was_late: false
              },
              %Grading.GradebookScore{
                label: "Page two",
                out_of: 5,
                resource_id: revision2.resource_id,
                score: 5,
                was_late: false
              }
            ],
            user:
              Map.merge(user3, %{
                enrollment_status: :enrolled,
                enrollment_date: user3_enrollment.inserted_at,
                total_count: 3
              })
          }
        ]
        |> Enum.sort_by(& &1.user.email)

      expected_column_labels = [
        "Page One - Points Earned",
        "Page One - Points Possible",
        "Page One - Percentage",
        "Page Two - Points Earned",
        "Page Two - Points Possible",
        "Page Two - Percentage"
      ]

      assert expected_gradebook == gradebook |> Enum.sort_by(& &1.user.email)
      assert expected_column_labels == columns
    end

    test "exports gradebook as CSV", %{section: section} do
      expected_csv = """
      Status,Name,Email,LMS ID,Page One - Points Earned,Page One - Points Possible,Page One - Percentage,Page Two - Points Earned,Page Two - Points Possible,Page Two - Percentage\r
      Enrolled,\"Doe, Jane 0\",jane0@platform.example.edu,user1,12,20,60,0,5,0\r
      Enrolled,\"Doe, Jane 1\",jane1@platform.example.edu,user2,20,20,100,3,5,60\r
      Enrolled,\"Doe, Jane 2\",jane2@platform.example.edu,user3,19,20,95,5,5,100\r
      """

      csv = Grading.export_csv(section)

      assert expected_csv == csv
    end
  end
end
