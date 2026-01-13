import Link from "next/link"
import { notFound } from "next/navigation"
import { Eye, Upload } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"

import { getProjectById } from "../data"

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ projectId: string }>
}) {
  const { projectId } = await params
  const project = getProjectById(projectId)
  if (!project) notFound()

  return (
    <div className="space-y-4">
      <div>
        <div className="text-muted-foreground text-sm">Project</div>
        <div className="text-xl font-semibold tracking-tight">{project.name}</div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Project Name</CardTitle>
          <CardDescription>Give your project an identifiable name</CardDescription>
        </CardHeader>
        <CardContent>
          <Input placeholder="e.g., Summer Campaign 2025" defaultValue={project.name} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Upload Creative Content</CardTitle>
          <CardDescription>Image, video, or text — or compare two versions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="border-muted/60 bg-muted/20 hover:bg-muted/30 flex min-h-[170px] cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-6 text-center transition-colors">
              <Upload className="text-muted-foreground size-7" />
              <div className="font-medium">Upload Content</div>
              <div className="text-muted-foreground text-sm">Image, Video, or Text</div>
            </div>
            <div className="border-muted/60 bg-muted/20 hover:bg-muted/30 flex min-h-[170px] cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-6 text-center transition-colors">
              <Eye className="text-muted-foreground size-7" />
              <div className="font-medium">A/B Compare</div>
              <div className="text-muted-foreground text-sm">Compare two versions</div>
            </div>
          </div>

          <Separator className="my-6" />

          <div className="flex items-center justify-between gap-3">
            <Button variant="secondary" asChild>
              <Link href="/dashboard">Back to Projects</Link>
            </Button>
            <Button className="px-8">Continue to Next Phase</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
