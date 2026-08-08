"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import {
  createFileSourceRequest,
  deleteSourceRequest,
  fetchSources,
} from "@/features/sources/api"

export const sourceKeys = {
  all: ["sources"] as const,
  list: (workspaceId: string) =>
    [...sourceKeys.all, "list", workspaceId] as const,
}

export function useSources(workspaceId: string) {
  return useQuery({
    queryKey: sourceKeys.list(workspaceId),
    queryFn: () => fetchSources(workspaceId),
    enabled: Boolean(workspaceId),
    refetchInterval: (query) => {
      const sources = query.state.data
      if (!sources) {
        return false
      }
      const busy = sources.some(
        (source) =>
          source.status === "pending" || source.status === "processing"
      )
      return busy ? 2000 : false
    },
  })
}

export function useCreateFileSource(workspaceId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (
      input: Parameters<typeof createFileSourceRequest>[1]
    ) => createFileSourceRequest(workspaceId, input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: sourceKeys.list(workspaceId),
      })
    },
  })
}

export function useDeleteSource(workspaceId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (sourceId: string) =>
      deleteSourceRequest(workspaceId, sourceId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: sourceKeys.list(workspaceId),
      })
    },
  })
}
