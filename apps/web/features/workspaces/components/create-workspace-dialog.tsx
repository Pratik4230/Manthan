"use client"

import { useForm } from "@tanstack/react-form"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { toast } from "sonner"

import { useCreateWorkspace } from "@/features/workspaces/hooks"
import { createWorkspaceInputSchema } from "@/server/workspaces/validations"
import { Button } from "@workspace/ui/components/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@workspace/ui/components/dialog"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@workspace/ui/components/field"
import { Input } from "@workspace/ui/components/input"
import { Textarea } from "@workspace/ui/components/textarea"

export function CreateWorkspaceDialog() {
  const router = useRouter()
  const createWorkspace = useCreateWorkspace()
  const [open, setOpen] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)

  const form = useForm({
    defaultValues: {
      title: "",
      instructions: "",
    },
    validators: {
      onSubmit: ({ value }) => {
        const parsed = createWorkspaceInputSchema.safeParse({
          title: value.title,
          instructions: value.instructions.trim()
            ? value.instructions.trim()
            : undefined,
        })
        if (parsed.success) {
          return undefined
        }
        return parsed.error.issues[0]?.message ?? "Invalid input"
      },
    },
    onSubmit: async ({ value }) => {
      try {
        const workspace = await createWorkspace.mutateAsync({
          title: value.title,
          instructions: value.instructions.trim()
            ? value.instructions.trim()
            : undefined,
        })
        toast.success("Workspace created")
        setOpen(false)
        form.reset()
        setShowAdvanced(false)
        router.push(`/workspaces/${workspace.id}`)
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Failed to create workspace"
        )
      }
    },
  })

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) {
          form.reset()
          setShowAdvanced(false)
        }
      }}
    >
      <DialogTrigger asChild>
        <Button>New workspace</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create workspace</DialogTitle>
          <DialogDescription>
            A workspace holds your sources and chat for one topic.
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(event) => {
            event.preventDefault()
            event.stopPropagation()
            void form.handleSubmit()
          }}
        >
          <FieldGroup>
            <form.Field name="title">
              {(field) => {
                const isInvalid =
                  field.state.meta.isTouched && !field.state.meta.isValid
                return (
                  <Field data-invalid={isInvalid}>
                    <FieldLabel htmlFor={field.name}>Title</FieldLabel>
                    <Input
                      id={field.name}
                      name={field.name}
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(event) =>
                        field.handleChange(event.target.value)
                      }
                      placeholder="e.g. Biology midterm"
                      aria-invalid={isInvalid}
                    />
                    {isInvalid ? (
                      <FieldError errors={field.state.meta.errors} />
                    ) : null}
                  </Field>
                )
              }}
            </form.Field>
            <Button
              type="button"
              variant="ghost"
              className="justify-start px-0"
              onClick={() => setShowAdvanced((value) => !value)}
            >
              {showAdvanced ? "Hide optional settings" : "Optional settings"}
            </Button>
            {showAdvanced ? (
              <form.Field name="instructions">
                {(field) => {
                  const isInvalid =
                    field.state.meta.isTouched && !field.state.meta.isValid
                  return (
                    <Field data-invalid={isInvalid}>
                      <FieldLabel htmlFor={field.name}>
                        Instructions (optional)
                      </FieldLabel>
                      <Textarea
                        id={field.name}
                        name={field.name}
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(event) =>
                          field.handleChange(event.target.value)
                        }
                        placeholder="Leave blank unless you need a custom chat style"
                        rows={4}
                        aria-invalid={isInvalid}
                      />
                      <FieldDescription>
                        Advanced. Most people can skip this.
                      </FieldDescription>
                      {isInvalid ? (
                        <FieldError errors={field.state.meta.errors} />
                      ) : null}
                    </Field>
                  )
                }}
              </form.Field>
            ) : null}
          </FieldGroup>
          <DialogFooter className="mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <form.Subscribe
              selector={(state) => [state.canSubmit, state.isSubmitting]}
            >
              {([canSubmit, isSubmitting]) => (
                <Button
                  type="submit"
                  disabled={!canSubmit || isSubmitting || createWorkspace.isPending}
                >
                  {isSubmitting || createWorkspace.isPending
                    ? "Creating…"
                    : "Create"}
                </Button>
              )}
            </form.Subscribe>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
