"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  ArrowLeft,
  BadgeCheck,
  FileDown,
  Flag,
  Shield,
  Sparkles,
  Target,
} from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"

const phaseItems = [
  { key: "setup", label: "Setup", icon: Flag, phaseNumber: 1 },
  { key: "goals", label: "Goals", icon: Target, phaseNumber: 2 },
  { key: "analysis", label: "Analysis", icon: Sparkles, phaseNumber: 3 },
  { key: "compliance", label: "Compliance", icon: Shield, phaseNumber: 4 },
  { key: "perception", label: "Perception", icon: BadgeCheck, phaseNumber: 5 },
  { key: "export", label: "Export", icon: FileDown, phaseNumber: 6 },
]

export function ProjectSidebar({
  projectId,
  projectName,
  activePhase = "setup",
}: {
  projectId: string
  projectName?: string
  activePhase?: string
}) {
  const pathname = usePathname()

  const activeKey = activePhase
  const activePhaseIndex = phaseItems.findIndex((p) => p.key === activeKey)

  return (
    <Sidebar variant="inset" collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip="Back to projects">
              <Link href="/dashboard">
                <ArrowLeft />
                <span>Back</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild tooltip={projectName ?? projectId}>
              <Link href={`/dashboard/projects/${projectId}`}>
                <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                  <Shield className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">{projectName ?? "Project"}</span>
                  <span className="truncate text-xs text-muted-foreground">{projectId}</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <div className="px-2 pt-1 text-xs text-muted-foreground group-data-[collapsible=icon]:hidden">
          Workflow
        </div>
        <SidebarMenu className="mt-1">
          {phaseItems.map((p, index) => {
            const isActive = activeKey === p.key
            const isCompleted = index < activePhaseIndex
            const isLocked = index > activePhaseIndex
            return (
              <SidebarMenuItem key={p.key}>
                <SidebarMenuButton
                  asChild
                  isActive={isActive}
                  aria-disabled={isLocked}
                  className={isLocked ? "opacity-50" : isCompleted ? "opacity-90" : undefined}
                  tooltip={p.label}
                >
                  <a href={pathname}>
                    <p.icon />
                    <span>{p.label}</span>
                    {isCompleted && (
                      <BadgeCheck className="ml-auto size-4 text-green-500" />
                    )}
                  </a>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )
          })}
        </SidebarMenu>
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  )
}

