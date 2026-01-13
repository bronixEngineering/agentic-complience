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
  { key: "setup", label: "Setup", icon: Flag, locked: false },
  { key: "goals", label: "Goals", icon: Target, locked: true },
  { key: "analysis", label: "Analysis", icon: Sparkles, locked: true },
  { key: "compliance", label: "Compliance", icon: Shield, locked: true },
  { key: "perception", label: "Perception", icon: BadgeCheck, locked: true },
  { key: "export", label: "Export", icon: FileDown, locked: true },
]

export function ProjectSidebar({
  projectId,
  projectName,
}: {
  projectId: string
  projectName?: string
}) {
  const pathname = usePathname()

  // We’ll expand this later to support /setup, /goals, etc.
  const activeKey = "setup"

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
          {phaseItems.map((p) => {
            const isActive = activeKey === p.key
            const disabled = p.locked
            return (
              <SidebarMenuItem key={p.key}>
                <SidebarMenuButton
                  asChild
                  isActive={isActive}
                  aria-disabled={disabled}
                  className={disabled ? "opacity-70" : undefined}
                  tooltip={p.label}
                >
                  <a href={pathname}>
                    <p.icon />
                    <span>{p.label}</span>
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

