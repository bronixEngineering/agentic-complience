import Link from "next/link"
import { notFound } from "next/navigation"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { createClient } from "@/lib/supabase/server"
import { ProjectBriefForm } from "./ProjectBriefForm"

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ projectId: string }>
}) {
  const { projectId } = await params
  const supabase = await createClient()

  const { data: project, error } = await supabase
    .from("projects")
    .select("*")
    .eq("id", projectId)
    .single()

  if (error || !project) {
    notFound()
  }

  return (
    <div className="space-y-4">
      <div>
        <div className="text-muted-foreground text-sm">Project</div>
        <div className="text-xl font-semibold tracking-tight">{project.name}</div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Project Brief</CardTitle>
          <CardDescription>
            Summarise the goal, target audience, style, format and message. Creative
            content will be generated from your brief.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ProjectBriefForm
            projectId={projectId}
            initialBrief={(project.meta as { brief?: unknown } | null)?.brief as any}
          />
        </CardContent>
      </Card>

      <div className="flex items-center gap-3">
        <Button variant="secondary" asChild>
          <Link href="/dashboard">Back to Projects</Link>
        </Button>
      </div>
    </div>
  )
}
