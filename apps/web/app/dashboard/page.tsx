import Link from "next/link"
import {
  AlertTriangle,
  ArrowUpRight,
  Clock,
  Globe,
  Plus,
  ShieldAlert,
  ShieldCheck,
  TriangleAlert,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"

import { demoComplianceEvents, demoProjects } from "./projects/data"

export default function DashboardHome() {
  const openWarnings = demoComplianceEvents.filter((e) => e.severity !== "info").length
  const inReviewCount = demoProjects.filter((p) => p.status === "In Review").length

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
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Open Warnings</CardTitle>
            <CardDescription>Human validation required</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <div className="text-3xl font-semibold tracking-tight">{openWarnings}</div>
            <ShieldAlert className="text-primary size-5" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">In Review</CardTitle>
            <CardDescription>Active compliance workflows</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <div className="text-3xl font-semibold tracking-tight">{inReviewCount}</div>
            <AlertTriangle className="text-primary size-5" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Latest Activity</CardTitle>
            <CardDescription>Last 24 hours</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <div className="text-3xl font-semibold tracking-tight">{demoComplianceEvents.length}</div>
            <Clock className="text-primary size-5" />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <div className="space-y-4">
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
            {demoProjects.map((p) => (
              <Card
                key={p.id}
                className="group hover:bg-muted/30 transition-colors"
              >
                <div className="flex h-full flex-col">
                  <CardHeader className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1">
                        <CardTitle className="text-base leading-6">{p.name}</CardTitle>
                        <div className="text-muted-foreground flex items-center gap-2 text-xs">
                          <Globe className="size-3.5" />
                          <span className="truncate">{p.brandDomain}</span>
                        </div>
                      </div>
                      <StatusBadge status={p.status} />
                    </div>

                    {/* Progress */}
                    <div className="space-y-1">
                      <div className="text-muted-foreground flex items-center justify-between text-xs">
                        <span>
                          {p.phasesComplete}/{p.phasesTotal} phases complete
                        </span>
                        <span>{p.progressPct}%</span>
                      </div>
                      <div className="bg-muted h-2 overflow-hidden rounded-full">
                        <div
                          className="bg-primary h-full rounded-full transition-all"
                          style={{ width: `${p.progressPct}%` }}
                        />
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="mt-auto space-y-3">
                    {/* Signals */}
                    <div className="flex flex-wrap items-center gap-2">
                      {p.risks > 0 ? (
                        <Badge variant="danger" className="gap-1">
                          <TriangleAlert className="size-3.5" />
                          {p.risks} high risk
                        </Badge>
                      ) : (
                        <Badge variant="success" className="gap-1">
                          <ShieldCheck className="size-3.5" />
                          No high risk
                        </Badge>
                      )}
                      {p.warnings > 0 ? (
                        <Badge variant="warning">{p.warnings} warnings</Badge>
                      ) : (
                        <Badge variant="secondary">0 warnings</Badge>
                      )}
                      <Badge variant="outline">Updated {p.updatedAt}</Badge>
                    </div>

                    {/* Channels */}
                    <div className="flex flex-wrap gap-1.5">
                      {p.channels.slice(0, 3).map((c) => (
                        <Badge key={c} variant="outline" className="text-xs">
                          {c}
                        </Badge>
                      ))}
                      {p.channels.length > 3 ? (
                        <Badge variant="outline" className="text-xs">
                          +{p.channels.length - 3}
                        </Badge>
                      ) : null}
                    </div>

                    {/* Last event + action */}
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-muted-foreground line-clamp-1 text-xs">
                        {p.lastEvent}
                      </div>
                      <Button size="sm" variant="secondary" asChild>
                        <Link href={`/dashboard/projects/${p.id}`}>
                          Open
                          <ArrowUpRight className="ml-2 size-4" />
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Latest Compliance Activity */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Latest Compliance</CardTitle>
              <CardDescription>Recent flags, approvals, and checks</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {demoComplianceEvents.map((e) => (
                <div key={e.id} className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <SeverityBadge severity={e.severity} />
                      <span className="text-sm font-medium">{e.phase}</span>
                      <span className="text-muted-foreground text-xs">{e.when}</span>
                    </div>
                    <div className="text-sm">{e.title}</div>
                    <Link
                      href={`/dashboard/projects/${e.projectId}`}
                      className="text-muted-foreground hover:text-foreground text-xs underline underline-offset-4"
                    >
                      {e.projectName}
                    </Link>
                  </div>
                  <Button size="sm" variant="ghost" asChild>
                    <Link href={`/dashboard/projects/${e.projectId}`}>View</Link>
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: "Draft" | "In Review" | "Paused" | "Complete" }) {
  if (status === "In Review") return <Badge variant="warning">In Review</Badge>
  if (status === "Paused") return <Badge variant="outline">Paused</Badge>
  if (status === "Complete") return <Badge variant="success">Complete</Badge>
  return <Badge variant="secondary">Draft</Badge>
}

function SeverityBadge({ severity }: { severity: "info" | "warning" | "risk" }) {
  if (severity === "risk") return <Badge variant="danger">High</Badge>
  if (severity === "warning") return <Badge variant="warning">Review</Badge>
  return <Badge variant="secondary">Info</Badge>
}

function CreateProjectDialog() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 size-4" />
          Create Project
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create project</DialogTitle>
          <DialogDescription>
            Placeholder for now — will be saved to Supabase soon.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label htmlFor="projectName">Project name</Label>
            <Input id="projectName" placeholder="e.g., Summer Campaign 2025" />
          </div>
        </div>

        <DialogFooter>
          <Button variant="secondary" type="button">
            Cancel
          </Button>
          <Button type="button">Create</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
