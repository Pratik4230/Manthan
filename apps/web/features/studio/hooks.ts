"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import {
  createArtifactRequest,
  deleteArtifactRequest,
  fetchArtifacts,
  regenerateArtifactRequest,
} from "@/features/studio/api"
import type { ArtifactType } from "@/server/models/artifact"

export const artifactKeys = {
  all: ["artifacts"] as const,
  list: (workspaceId: string) =>
    [...artifactKeys.all, "list", workspaceId] as const,
}

export function useArtifacts(workspaceId: string) {
  return useQuery({
    queryKey: artifactKeys.list(workspaceId),
    queryFn: () => fetchArtifacts(workspaceId),
    enabled: Boolean(workspaceId),
    refetchInterval: (query) => {
      const artifacts = query.state.data
      if (!artifacts) {
        return false
      }
      const busy = artifacts.some(
        (artifact) =>
          artifact.status === "pending" || artifact.status === "processing"
      )
      return busy ? 2000 : false
    },
  })
}

export function useCreateArtifact(workspaceId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (type: ArtifactType) =>
      createArtifactRequest(workspaceId, type),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: artifactKeys.list(workspaceId),
      })
    },
  })
}

export function useRegenerateArtifact(workspaceId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (artifactId: string) =>
      regenerateArtifactRequest(workspaceId, artifactId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: artifactKeys.list(workspaceId),
      })
    },
  })
}

export function useDeleteArtifact(workspaceId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (artifactId: string) =>
      deleteArtifactRequest(workspaceId, artifactId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: artifactKeys.list(workspaceId),
      })
    },
  })
}
