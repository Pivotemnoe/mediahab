import type {
  ContentListResponse,
  MeResponse,
  NotebookNoteListResponse,
  NotebookNoteOut,
  ProjectListResponse,
} from "@/services/openapi-types";
import { getDataMode, safeApiGet } from "@/services/runtime";

export interface NotebookViewModel {
  contentItems: Array<{ id: string; label: string }>;
  notice?: string;
  notes: NotebookNoteOut[];
  projects: Array<{ id: string; name: string }>;
  workspaceId: string | null;
}

export async function getNotebookViewModel(): Promise<NotebookViewModel> {
  if (getDataMode() !== "api") {
    return {
      contentItems: [],
      notice: "После входа здесь можно будет сохранять мысли и записи.",
      notes: [],
      projects: [],
      workspaceId: null,
    };
  }
  const me = await safeApiGet<MeResponse>("/api/v1/me");
  const workspace = me?.workspaces[0];
  if (!workspace) {
    return {
      contentItems: [],
      notice: "Не получилось открыть кабинет. Обнови страницу или войди заново.",
      notes: [],
      projects: [],
      workspaceId: null,
    };
  }
  const [notesResponse, projectsResponse] = await Promise.all([
    safeApiGet<NotebookNoteListResponse>(`/api/v1/notebook?workspace_id=${workspace.id}`),
    safeApiGet<ProjectListResponse>(`/api/v1/workspaces/${workspace.id}/projects`),
  ]);
  const projects = projectsResponse?.projects ?? [];
  const content = await Promise.all(
    projects.map(async (project) => ({
      project,
      rows: await safeApiGet<ContentListResponse>(`/api/v1/projects/${project.id}/content-items`),
    })),
  );
  return {
    contentItems: content.flatMap(({ project, rows }) =>
      (rows?.content_items ?? []).map((item) => ({
        id: item.id,
        label: `${project.name} · ${item.title_internal}`,
      })),
    ),
    notice: notesResponse && projectsResponse ? undefined : "Не всё загрузилось. Обнови страницу — сохранённые заметки останутся на месте.",
    notes: notesResponse?.notes ?? [],
    projects: projects.map((project) => ({ id: project.id, name: project.name })),
    workspaceId: workspace.id,
  };
}
