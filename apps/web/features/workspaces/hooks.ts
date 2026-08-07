"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import {
  createWorkspaceRequest,
  deleteWorkspaceRequest,
  fetchWorkspace,
  fetchWorkspaces,
  updateWorkspaceRequest,
} from "@/features/workspaces/api"

export const workspaceKeys = {
  all: ["workspaces"] as const,
  lists: () => [...workspaceKeys.all, "list"] as const,
  detail: (workspaceId: string) =>
    [...workspaceKeys.all, "detail", workspaceId] as const,
}

export function useWorkspaces() {
  return useQuery({
    queryKey: workspaceKeys.lists(),
    queryFn: fetchWorkspaces,
  })
}

export function useWorkspace(workspaceId: string) {
  return useQuery({
    queryKey: workspaceKeys.detail(workspaceId),
    queryFn: () => fetchWorkspace(workspaceId),
    enabled: Boolean(workspaceId),
  })
}

export function useCreateWorkspace() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createWorkspaceRequest,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: workspaceKeys.lists() })
    },
  })
}

export function useUpdateWorkspace(workspaceId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: { title?: string; instructions?: string }) =>
      updateWorkspaceRequest(workspaceId, input),
    onSuccess: async (workspace) => {
      await queryClient.invalidateQueries({ queryKey: workspaceKeys.lists() })
      queryClient.setQueryData(workspaceKeys.detail(workspaceId), workspace)
    },
  })
}

export function useDeleteWorkspace() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deleteWorkspaceRequest,
    onSuccess: async (_data, workspaceId) => {
      await queryClient.invalidateQueries({ queryKey: workspaceKeys.lists() })
      queryClient.removeQueries({ queryKey: workspaceKeys.detail(workspaceId) })
    },
  })
}
