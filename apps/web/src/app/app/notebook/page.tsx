import { NotebookView } from "@/components/notebook/notebook-view";
import { getNotebookViewModel } from "@/services/notebook";

export default async function NotebookPage() {
  const viewModel = await getNotebookViewModel();
  return <NotebookView viewModel={viewModel} />;
}
