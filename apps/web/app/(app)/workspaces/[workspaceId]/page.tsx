import { WorkspaceNotebook } from "@/features/workspaces/components/workspace-notebook"

export default async function WorkspacePage({
  params,
}: {
  params: Promise<{ workspaceId: string }>
}) {
  const { workspaceId } = await params
  return <WorkspaceNotebook workspaceId={workspaceId} />
}
