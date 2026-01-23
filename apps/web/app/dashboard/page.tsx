import Link from "next/link"
import {
  AlertTriangle,
  ArrowUpRight,
  Clock,
  ShieldAlert,
  User,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"

import { CreateProjectDialog } from "./create-project-dialog"
import { createClient } from "@/lib/supabase/server"

type Project = {
  id: string
  name: string
  status: "draft" | "in_review" | "paused" | "complete"
  active_phase: string
  progress_pct: number
  created_at: string
  updated_at: string
  created_by: string
}

function formatDate(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return "Today"
  if (diffDays === 1) return "Yesterday"
  if (diffDays < 7) return `${diffDays} days ago`
  return date.toLocaleDateString()
}

export default async function DashboardHome() {
  const supabase = await createClient()

  // Get current user
  const { data: { user } } = await supabase.auth.getUser()

  const { data: projects, error } = await supabase
    .from("projects")
    .select("*")
    .order("updated_at", { ascending: false })

  const projectsList: Project[] = projects || []
  const inReviewCount = projectsList.filter((p) => p.status === "in_review").length

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Projects</h1>
          <p className="text-muted-foreground text-sm">
            Create a project, upload creatives, and run compliance checks across phases.
          </p>
        </div>

        <CreateProjectDialog />
      </div>

      {/* KPIs */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card variant="glass" className="hover:scale-[1.01] transition-all duration-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Projects</CardTitle>
            <CardDescription>All your projects</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <div className="text-3xl font-semibold tracking-tight">{projectsList.length}</div>
            <ShieldAlert className="text-foreground/70 size-5 transition-transform group-hover:scale-110" />
          </CardContent>
        </Card>
        <Card variant="glass" className="hover:scale-[1.01] transition-all duration-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">In Review</CardTitle>
            <CardDescription>Active compliance workflows</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <div className="text-3xl font-semibold tracking-tight">{inReviewCount}</div>
            <AlertTriangle className="text-foreground/70 size-5 transition-transform group-hover:scale-110" />
          </CardContent>
        </Card>
        <Card variant="glass" className="hover:scale-[1.01] transition-all duration-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Draft Projects</CardTitle>
            <CardDescription>Projects in setup</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <div className="text-3xl font-semibold tracking-tight">
              {projectsList.filter((p) => p.status === "draft").length}
            </div>
            <Clock className="text-foreground/70 size-5 transition-transform group-hover:scale-110" />
          </CardContent>
        </Card>
      </div>

      {/* Search / filter */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 items-center gap-2">
          <Input placeholder="Search projects…" className="max-w-md" />
          <Badge variant="secondary">All</Badge>
          <Badge variant="outline">Draft</Badge>
          <Badge variant="outline">In Review</Badge>
          <Badge variant="outline">Paused</Badge>
        </div>
      </div>

      {/* Projects */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {projectsList.length === 0 ? (
          <div className="col-span-full">
            <Card variant="glass">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <p className="text-muted-foreground mb-4 text-center">
                  No projects yet. Create your first project to get started.
                </p>
                <CreateProjectDialog />
              </CardContent>
            </Card>
          </div>
        ) : (
          projectsList.map((p) => (
            <Link key={p.id} href={`/dashboard/projects/${p.id}`} className="group">
              <Card variant="glass" className="h-full transition-all duration-200 hover:scale-[1.02]">
                <div className="flex h-full flex-col">
                  <CardHeader className="space-y-3 pb-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 space-y-1">
                        <CardTitle className="text-lg leading-6 group-hover:text-primary transition-colors">
                          {p.name}
                        </CardTitle>
                        <div className="space-y-1">
                          <div className="text-muted-foreground flex items-center gap-1.5 text-xs">
                            <Clock className="size-3" />
                            <span>Updated {formatDate(p.updated_at)}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <User className="size-3 text-muted-foreground" />
                            <span className="text-muted-foreground text-xs">
                              {user && p.created_by === user.id ? (
                                <span className="font-medium">Created by you</span>
                              ) : (
                                <span>Created by team member</span>
                              )}
                            </span>
                          </div>
                        </div>
                      </div>
                      <StatusBadge status={p.status} />
                    </div>

                    {/* Active Phase */}
                    <div className="bg-muted/50 rounded-lg border p-3">
                      <div className="text-muted-foreground mb-1 text-xs font-medium">
                        Current Phase
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold capitalize">
                          {p.active_phase}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {p.progress_pct}% Complete
                        </Badge>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-2">
                      <div className="bg-muted h-2.5 overflow-hidden rounded-full">
                        <div
                          className="bg-primary h-full rounded-full transition-all duration-300 ease-out"
                          style={{ width: `${p.progress_pct}%` }}
                        />
                      </div>
                      <div className="text-muted-foreground flex items-center justify-between text-xs">
                        <span>Overall Progress</span>
                        <span className="font-medium">{p.progress_pct}%</span>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="mt-auto pt-0">
                    <div className="flex items-center justify-between">
                      <div className="text-muted-foreground text-xs">
                        Created {formatDate(p.created_at)}
                      </div>
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        className="group-hover:bg-primary group-hover:text-primary-foreground -mr-2 transition-colors"
                      >
                        View Details
                        <ArrowUpRight className="ml-1.5 size-4" />
                      </Button>
                    </div>
                  </CardContent>
                </div>
              </Card>
            </Link>
          ))
        )}
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: "draft" | "in_review" | "paused" | "complete" }) {
  if (status === "in_review") return <Badge variant="warning">In Review</Badge>
  if (status === "paused") return <Badge variant="outline">Paused</Badge>
  if (status === "complete") return <Badge variant="success">Complete</Badge>
  return <Badge variant="secondary">Draft</Badge>
}
