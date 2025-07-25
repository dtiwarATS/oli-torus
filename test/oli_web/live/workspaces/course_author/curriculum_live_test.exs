defmodule OliWeb.Workspaces.CourseAuthor.CurriculumLiveTest do
  use OliWeb.ConnCase

  alias Oli.Seeder
  alias Oli.Publishing
  alias Oli.Resources.ResourceType

  import Oli.Factory
  import Phoenix.ConnTest
  import Phoenix.LiveViewTest

  @endpoint OliWeb.Endpoint

  describe "cannot access when is not logged in" do
    test "redirect to new session when accessing the curriculum view", %{
      conn: conn
    } do
      project = insert(:project)

      {:error, {:redirect, %{to: "/authors/log_in"}}} =
        live(conn, live_view_route(project.slug))
    end
  end

  describe "cannot access when is not an author" do
    setup [:user_conn]

    test "redirect to new session when accessing the curriculum view", %{
      conn: conn
    } do
      project = insert(:project)

      {:error, {:redirect, %{to: "/authors/log_in"}}} =
        live(conn, live_view_route(project.slug))
    end
  end

  describe "user cannot access when is logged in as an author but is not an author of the project" do
    setup [:author_conn]

    test "redirects to projects view when accessing the objectives view", %{
      conn: conn
    } do
      project = insert(:project)

      {:error, {:redirect, %{to: "/workspaces/course_author"}}} =
        live(conn, live_view_route(project.slug))
    end
  end

  describe "curriculum live test" do
    setup [:setup_session]

    test "shows the author name editing the page correctly", %{
      conn: conn,
      project: project,
      map: %{
        published_resource1: published_resource1
      }
    } do
      editing_author = insert(:author)

      Publishing.update_published_resource(published_resource1, %{
        locked_by_id: editing_author.id,
        lock_updated_at: now()
      })

      {:ok, view, _} = live(conn, live_view_route(project.slug))

      assert has_element?(view, "span", "#{editing_author.name} is editing")
    end

    test "shows duplicate action for pages", %{
      conn: conn,
      author: author,
      project: project,
      revision1: revision_page_one,
      revision2: revision_page_two
    } do
      conn =
        recycle(conn)
        |> log_in_author(author)
        |> get("/workspaces/course_author/#{project.slug}/curriculum/")

      {:ok, view, _html} = live(conn)

      # Duplicate action is present with the right revision id
      assert view
             |> element(
               "div[phx-value-slug=\"#{revision_page_one.slug}\"] button[role=\"duplicate_page\"]"
             )
             |> render =~ "phx-value-id=\"#{revision_page_one.id}\""

      # Clicking on duplicate action creates a new entry with the right title name
      view
      |> element(
        "div[phx-value-slug=\"#{revision_page_two.slug}\"] button[role=\"duplicate_page\"]"
      )
      |> render_click =~
        "entry-title\">Copy of #{revision_page_two.title}</span>"
    end

    test "does not show duplicate action for adaptive pages", %{
      conn: conn,
      author: author,
      project: project,
      adaptive_page_revision: adaptive_page_revision
    } do
      conn =
        recycle(conn)
        |> log_in_author(author)
        |> get("/workspaces/course_author/#{project.slug}/curriculum/")

      {:ok, view, _html} = live(conn)

      assert view
             |> has_element?("div[phx-value-slug=\"#{adaptive_page_revision.slug}\"]")

      refute view
             |> has_element?(
               "div[phx-value-slug=\"#{adaptive_page_revision.slug}\"] button[phx-click=\"duplicate_page\"]"
             )
    end

    test "show the correct fields for the page option modal", %{
      conn: conn,
      author: author,
      project: project,
      revision1: revision_page_one
    } do
      conn =
        recycle(conn)
        |> log_in_author(author)
        |> get("/workspaces/course_author/#{project.slug}/curriculum/")

      {:ok, view, _html} = live(conn)

      view
      |> element(
        "div[phx-value-slug=\"#{revision_page_one.slug}\"] button[role=\"show_options_modal\"]"
      )
      |> render_click() =~ "Page Options"

      assert has_element?(
               view,
               "form#revision-settings-form [name=\"revision[title]\"]"
             )

      assert has_element?(
               view,
               "form#revision-settings-form [name=\"revision[graded]\"]"
             )

      assert has_element?(
               view,
               "form#revision-settings-form [name=\"revision[explanation_strategy][type]\"]"
             )

      assert has_element?(
               view,
               "form#revision-settings-form [name=\"revision[max_attempts]\"]"
             )

      assert has_element?(
               view,
               "form#revision-settings-form [name=\"revision[scoring_strategy_id]\"]"
             )

      assert has_element?(
               view,
               "form#revision-settings-form [name=\"revision[retake_mode]\"]"
             )

      assert has_element?(
               view,
               "form#revision-settings-form [name=\"revision[assessment_mode]\"]"
             )

      assert has_element?(
               view,
               "form#revision-settings-form [name=\"revision[purpose]\"]"
             )

      assert has_element?(
               view,
               "form#revision-settings-form div#related-resources-selector"
             )
    end

    test "when the page is of type 'foundation', the related resources selector is disabled",
         %{
           conn: conn,
           author: author,
           project: project,
           revision1: revision_page_one
         } do
      conn =
        recycle(conn)
        |> log_in_author(author)
        |> get("/workspaces/course_author/#{project.slug}/curriculum/")

      {:ok, view, _html} = live(conn)

      view
      |> element(
        "div[phx-value-slug=\"#{revision_page_one.slug}\"] button[role=\"show_options_modal\"]"
      )
      |> render_click()

      view
      |> form("form#revision-settings-form", %{
        "revision" => %{
          "purpose" => "foundation"
        }
      })

      assert view
             |> element("div#related-resources-selector")
             |> render() =~ "disabled"
    end

    test "the related resources get updated in the database", %{
      conn: conn,
      author: author,
      project: project,
      revision1: revision_page_one,
      revision2: revision_page_two
    } do
      conn =
        recycle(conn)
        |> log_in_author(author)
        |> get("/workspaces/course_author/#{project.slug}/curriculum/")

      {:ok, view, _html} = live(conn)

      view
      |> element(
        "div[phx-value-slug=\"#{revision_page_one.slug}\"] button[role=\"show_options_modal\"]"
      )
      |> render_click()

      view
      |> form("form#revision-settings-form")
      |> render_submit(%{
        "revision" => %{
          "purpose" => "application",
          "relates_to" => [revision_page_two.resource_id]
        }
      })

      assert Oli.Publishing.AuthoringResolver.from_revision_slug(
               project.slug,
               revision_page_one.slug
             )
             |> Map.get(:relates_to) == [revision_page_two.resource_id]
    end

    test "an author can not see the `view revision history` link", %{
      conn: conn,
      author: author,
      project: project
    } do
      conn =
        recycle(conn)
        |> log_in_author(author)
        |> get("/workspaces/course_author/#{project.slug}/curriculum/")
        |> Map.put(
          :request_path,
          "/workspaces/course_author/#{project.slug}/curriculum#show_links"
        )

      {:ok, view, _html} = live(conn)

      refute render(view) =~ "View revision history"
    end

    test "edit link uses `href` for adaptive pages and `navigate` for regular pages", %{
      conn: conn,
      author: author,
      project: project,
      revision1: revision_page_one,
      adaptive_page_revision: adaptive_page_revision
    } do
      conn =
        recycle(conn)
        |> log_in_author(author)
        |> get("/workspaces/course_author/#{project.slug}/curriculum/")

      {:ok, view, _html} = live(conn)

      [edit_link_regular] =
        view
        |> element("div[phx-value-slug=\"#{revision_page_one.slug}\"]")
        |> render()
        |> Floki.parse_document!()
        |> Floki.find("a.entry-title.mx-3")

      [edit_link_adaptive] =
        view
        |> element("div[phx-value-slug=\"#{adaptive_page_revision.slug}\"]")
        |> render()
        |> Floki.parse_document!()
        |> Floki.find("a.entry-title.mx-3")

      # For regular page, should have data-phx-link="redirect" (navigate)
      assert Floki.attribute(edit_link_regular, "data-phx-link") == ["redirect"]
      assert Floki.attribute(edit_link_regular, "href") != []

      # For adaptive page, should NOT have data-phx-link (plain href)
      assert Floki.attribute(edit_link_adaptive, "data-phx-link") == []
      assert Floki.attribute(edit_link_adaptive, "href") != []
    end
  end

  describe "curriculum live test (as admin)" do
    setup [:setup_session, :admin_conn]

    test "can see the `view revision history` link if the url has #show_links",
         %{
           conn: conn,
           project: project
         } do
      conn =
        conn
        |> get("/workspaces/course_author/#{project.slug}/curriculum/")
        |> Map.put(
          :request_path,
          "/workspaces/course_author/#{project.slug}/curriculum#show_links"
        )

      {:ok, view, _html} = live(conn)

      assert render(view) =~ "View revision history"
    end

    test "can not see the `view revision history` link if the url does not have #show_links",
         %{
           conn: conn,
           project: project
         } do
      conn =
        conn
        |> get("/workspaces/course_author/#{project.slug}/curriculum/")

      {:ok, view, _html} = live(conn)

      refute render(view) =~ "View revision history"
    end

    @tag :skip
    test "can navigate to all pages view", %{conn: conn, project: project} do
      conn =
        conn
        |> get("/workspaces/course_author/#{project.slug}/curriculum/")

      {:ok, view, _html} = live(conn)

      view
      |> element("a[role='go_to_all_pages']", "All Pages")
      |> render_click()

      assert_redirect(
        view,
        ~p"/workspaces/course_author/#{project.slug}/pages"
      )
    end
  end

  describe "options modal" do
    setup [:create_project, :admin_conn]

    test "can be opened for a page", %{
      conn: conn,
      project: project,
      page_2: page_2
    } do
      {:ok, view, _html} =
        live(conn, ~p"/workspaces/course_author/#{project.slug}/curriculum")

      refute view
             |> has_element?(
               ~s{div[id='options_modal-container'] h1[id="options_modal-title"]},
               "Page Options"
             )

      view
      |> element(
        ~s{button[role="show_options_modal"][phx-value-slug="#{page_2.slug}"]},
        "Options"
      )
      |> render_click()

      assert view
             |> has_element?(
               ~s{div[id='options_modal-container'] h1[id="options_modal-title"]},
               "Page Options"
             )
    end

    test "can be opened for a container", %{
      conn: conn,
      project: project,
      unit: unit
    } do
      {:ok, view, _html} =
        live(conn, ~p"/workspaces/course_author/#{project.slug}/curriculum")

      refute view
             |> has_element?(
               ~s{div[id='options_modal-container'] h1[id="options_modal-title"]},
               "Container Options"
             )

      view
      |> element(
        ~s{button[role="show_options_modal"][phx-value-slug="#{unit.slug}"]},
        "Options"
      )
      |> render_click()

      assert view
             |> has_element?(
               ~s{div[id='options_modal-container'] h1[id="options_modal-title"]},
               "Container Options"
             )
    end

    test "updates a revision data when a `save-options` event is handled after submitting the options modal",
         %{
           conn: conn,
           project: project,
           page_2: page_2,
           author_1: author_1,
           author_2: author_2
         } do
      author_1_id = author_1.id
      author_2_id = author_2.id

      assert %Oli.Resources.Revision{
               retake_mode: :normal,
               assessment_mode: :traditional,
               duration_minutes: nil,
               graded: false,
               max_attempts: 0,
               purpose: :foundation,
               scoring_strategy_id: 1,
               explanation_strategy: nil,
               author_id: ^author_1_id
             } =
               _initial_revision =
               Oli.Publishing.AuthoringResolver.from_revision_slug(
                 project.slug,
                 page_2.slug
               )

      # author 2 logs in and edits the page
      conn = recycle_author_session(conn, author_2)

      {:ok, view, _html} =
        live(conn, ~p"/workspaces/course_author/#{project.slug}/curriculum")

      assert has_element?(view, "span", "Page 2")

      view
      |> element(
        ~s{button[role="show_options_modal"][phx-value-slug="#{page_2.slug}"]},
        "Options"
      )
      |> render_click()

      view
      |> render_hook("save-options", %{
        "revision" => %{
          "duration_minutes" => "5",
          "explanation_strategy" => %{"type" => "after_max_resource_attempts_exhausted"},
          "graded" => "true",
          "max_attempts" => "10",
          "poster_image" => "some_poster_image_url",
          "purpose" => "application",
          "retake_mode" => "targeted",
          "assessment_mode" => "one_at_a_time",
          "scoring_strategy_id" => "2",
          "title" => "New Title!!",
          "intro_content" =>
            Jason.encode!(%{
              "type" => "p",
              "children" => [
                %{
                  "id" => "3477687079",
                  "type" => "p",
                  "children" => [%{"text" => "Some new intro content text!"}]
                }
              ]
            })
        }
      })

      {path, flash} = assert_redirect(view)

      assert path =~ "/workspaces/course_author/#{project.slug}/curriculum/root_container"
      assert flash == %{"info" => "Page options saved"}

      {:ok, view, _html} =
        live(conn, ~p"/workspaces/course_author/#{project.slug}/curriculum")

      assert has_element?(view, "span", "New Title!!")

      assert %Oli.Resources.Revision{
               retake_mode: :targeted,
               assessment_mode: :one_at_a_time,
               duration_minutes: 5,
               graded: true,
               max_attempts: 10,
               purpose: :application,
               scoring_strategy_id: 2,
               explanation_strategy: %Oli.Resources.ExplanationStrategy{
                 type: :after_max_resource_attempts_exhausted,
                 set_num_attempts: nil
               },
               poster_image: "some_poster_image_url",
               intro_content: %{
                 "children" => [
                   %{
                     "children" => [%{"text" => "Some new intro content text!"}],
                     "id" => "3477687079",
                     "type" => "p"
                   }
                 ],
                 "type" => "p"
               },
               author_id: ^author_2_id
             } =
               _updated_revision =
               Oli.Publishing.AuthoringResolver.from_revision_slug(
                 project.slug,
                 page_2.slug
               )
    end

    test "updates a revision data when a `save-options` event is handled after submitting the options modal with no intro content defined (when submitting a page, for instance)",
         %{
           conn: conn,
           project: project,
           page_2: page_2
         } do
      {:ok, view, _html} =
        live(conn, ~p"/workspaces/course_author/#{project.slug}/curriculum")

      assert has_element?(view, "span", "Page 2")

      assert %Oli.Resources.Revision{
               retake_mode: :normal,
               assessment_mode: :traditional,
               duration_minutes: nil,
               graded: false,
               max_attempts: 0,
               purpose: :foundation,
               scoring_strategy_id: 1,
               explanation_strategy: nil
             } =
               _initial_revision =
               Oli.Publishing.AuthoringResolver.from_revision_slug(
                 project.slug,
                 page_2.slug
               )

      view
      |> element(
        ~s{button[role="show_options_modal"][phx-value-slug="#{page_2.slug}"]},
        "Options"
      )
      |> render_click()

      view
      |> render_hook("save-options", %{
        "revision" => %{
          "duration_minutes" => "5",
          "explanation_strategy" => %{"type" => "after_max_resource_attempts_exhausted"},
          "graded" => "true",
          "max_attempts" => "10",
          "poster_image" => "some_poster_image_url",
          "purpose" => "application",
          "retake_mode" => "targeted",
          "assessment_mode" => "one_at_a_time",
          "scoring_strategy_id" => "2",
          "title" => "New Title!!"
        }
      })

      {path, flash} = assert_redirect(view)

      assert path =~ "/workspaces/course_author/#{project.slug}/curriculum/root_container"
      assert flash == %{"info" => "Page options saved"}

      {:ok, view, _html} =
        live(conn, ~p"/workspaces/course_author/#{project.slug}/curriculum")

      assert has_element?(view, "span", "New Title!!")

      assert %Oli.Resources.Revision{
               retake_mode: :targeted,
               assessment_mode: :one_at_a_time,
               duration_minutes: 5,
               graded: true,
               max_attempts: 10,
               purpose: :application,
               scoring_strategy_id: 2,
               explanation_strategy: %Oli.Resources.ExplanationStrategy{
                 type: :after_max_resource_attempts_exhausted,
                 set_num_attempts: nil
               },
               poster_image: "some_poster_image_url"
             } =
               _updated_revision =
               Oli.Publishing.AuthoringResolver.from_revision_slug(
                 project.slug,
                 page_2.slug
               )
    end
  end

  describe "Delete page" do
    setup [:admin_conn]

    test "renders deletion restriction message and lists linking resources", %{conn: conn} do
      author = insert(:author)

      project = insert(:project, authors: [author])

      page_1_revision =
        insert(:revision, %{
          slug: "page_1",
          title: "Page 1",
          resource_type_id: ResourceType.id_for_page(),
          author_id: author.id
        })

      page_2_revision =
        insert(:revision, %{
          slug: "page_2",
          title: "Page 2",
          resource_type_id: ResourceType.id_for_page(),
          author_id: author.id
        })

      page_3_revision =
        insert(:revision, %{
          slug: "page_3",
          title: "Page 3",
          resource_type_id: ResourceType.id_for_page(),
          author_id: author.id
        })

      container_revision =
        insert(:revision, %{
          objectives: %{},
          resource_type_id: ResourceType.id_for_container(),
          children: [
            page_1_revision.resource_id,
            page_2_revision.resource_id,
            page_3_revision.resource_id
          ],
          content: %{},
          slug: "root_container",
          title: "Root Container",
          author_id: author.id
        })

      all_revisions = [page_1_revision, page_2_revision, page_3_revision, container_revision]

      # asociate resources to project
      Enum.each(all_revisions, fn revision ->
        insert(:project_resource, %{project_id: project.id, resource_id: revision.resource_id})
      end)

      # publish project
      publication =
        insert(:publication, %{
          project: project,
          root_resource_id: container_revision.resource_id,
          published: nil
        })

      # publish resources
      Enum.each(all_revisions, fn revision ->
        insert(:published_resource, %{
          publication: publication,
          resource: revision.resource,
          revision: revision,
          author: author
        })
      end)

      # Replace content to have a hyperlink pointing to page 3
      Oli.Resources.update_revision(page_1_revision, %{
        content: create_hyperlink_content("page_3")
      })

      # Replace content to have a page link pointing to page 3
      Oli.Resources.update_revision(page_2_revision, %{
        content: create_page_link_content(page_3_revision.resource_id)
      })

      {:ok, view, _html} = live(conn, ~p"/workspaces/course_author/#{project.slug}/curriculum")

      render_click(view, "show_delete_modal", %{"slug" => "#{page_3_revision.slug}"})

      # Extract titles and hyperlinks all in one list
      results =
        view
        |> element("#not_empty_#{page_3_revision.slug}")
        |> render()
        |> Floki.parse_document!()
        |> Floki.find("li")
        |> Enum.reduce([], fn a_tag, acc ->
          href = Floki.find(a_tag, "a") |> Floki.attribute("href") |> List.first()
          text = Floki.text(a_tag)
          [text, href | acc]
        end)

      assert Enum.any?(results, fn result -> result =~ page_1_revision.title end)
      assert Enum.any?(results, fn result -> result =~ page_2_revision.title end)
      assert Enum.any?(results, fn result -> result =~ page_1_revision.slug end)
      assert Enum.any?(results, fn result -> result =~ page_2_revision.slug end)
    end
  end

  defp setup_session(%{conn: conn}) do
    map =
      Seeder.base_project_with_resource2()
      |> Seeder.add_adaptive_page()

    conn =
      Plug.Test.init_test_session(conn, lti_session: nil)
      |> log_in_author(map.author)

    {:ok,
     conn: conn,
     map: map,
     author: map.author,
     project: map.project,
     adaptive_page_revision: map.adaptive_page_revision,
     revision1: map.revision1,
     revision2: map.revision2,
     container: map.container.revision}
  end

  defp create_project(_) do
    author_1 = insert(:author)
    author_2 = insert(:author)

    project = insert(:project, authors: [author_1, author_2])

    page_revision =
      insert(:revision, %{
        objectives: %{"attached" => []},
        scoring_strategy_id: Oli.Resources.ScoringStrategy.get_id_by_type("average"),
        resource_type_id: Oli.Resources.ResourceType.id_for_page(),
        children: [],
        content: %{"model" => []},
        deleted: false,
        title: "Page 1",
        author_id: author_1.id
      })

    page_2_revision =
      insert(:revision, %{
        objectives: %{"attached" => []},
        scoring_strategy_id: Oli.Resources.ScoringStrategy.get_id_by_type("average"),
        resource_type_id: Oli.Resources.ResourceType.id_for_page(),
        children: [],
        content: %{"model" => []},
        deleted: false,
        title: "Page 2",
        author_id: author_1.id
      })

    unit_revision =
      insert(:revision, %{
        objectives: %{},
        resource_type_id: Oli.Resources.ResourceType.id_for_container(),
        children: [page_revision.resource_id],
        content: %{"model" => []},
        deleted: false,
        title: "The first unit",
        slug: "first_unit",
        author_id: author_1.id
      })

    container_revision =
      insert(:revision, %{
        objectives: %{},
        resource_type_id: Oli.Resources.ResourceType.id_for_container(),
        children: [unit_revision.resource_id, page_2_revision.resource_id],
        content: %{},
        deleted: false,
        slug: "root_container",
        title: "Root Container",
        author_id: author_1.id
      })

    all_revisions =
      [
        page_revision,
        page_2_revision,
        unit_revision,
        container_revision
      ]

    # asociate resources to project
    Enum.each(all_revisions, fn revision ->
      insert(:project_resource, %{
        project_id: project.id,
        resource_id: revision.resource_id
      })
    end)

    # publish project
    publication =
      insert(:publication, %{
        project: project,
        root_resource_id: container_revision.resource_id,
        published: nil
      })

    # publish resources
    Enum.each(all_revisions, fn revision ->
      insert(:published_resource, %{
        publication: publication,
        resource: revision.resource,
        revision: revision,
        author: author_1
      })
    end)

    %{
      publication: publication,
      project: project,
      unit: unit_revision,
      page: page_revision,
      page_2: page_2_revision,
      author_1: author_1,
      author_2: author_2
    }
  end

  defp live_view_route(project_slug, container_slug \\ nil, params \\ %{}) do
    if container_slug do
      ~p"/workspaces/course_author/#{project_slug}/curriculum/#{container_slug}?#{params}"
    else
      ~p"/workspaces/course_author/#{project_slug}/curriculum?#{params}"
    end
  end
end
