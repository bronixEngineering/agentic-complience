"use client"

import * as React from "react"
import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import {
  ArrowLeft,
  BadgeCheck,
  FileText,
  CheckCircle,
  Sparkles,
  Images,
  Clock,
  Edit3,
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
import { Separator } from "@/components/ui/separator"

const workflowItems = [
  { 
    key: "brief", 
    label: "Create Brief", 
    icon: FileText, 
    href: "",
    description: "Write your creative brief"
  },
  { 
    key: "approval", 
    label: "Review Brief", 
    icon: CheckCircle, 
    href: "/approval",
    description: "Review AI-enhanced brief"
  },
  { 
    key: "results", 
    label: "Results", 
    icon: Sparkles, 
    href: "/results",
    description: "View generated images"
  },
]

const projectItems = [
  { 
    key: "gallery", 
    label: "All Images", 
    icon: Images, 
    href: "/gallery",
    description: "Browse all generated content"
  },
  { 
    key: "edit-queue", 
    label: "Edit Queue", 
    icon: Edit3, 
    href: "/edit-queue",
    description: "Images being edited"
  },
  { 
    key: "history", 
    label: "History", 
    icon: Clock, 
    href: "/history",
    description: "View project timeline"
  },
]

export function ProjectSidebar({
  projectId,
  projectName,
  activePhase = "brief",
  completedSteps = [],
}: {
  projectId: string
  projectName?: string
  activePhase?: string
  completedSteps?: string[]
}) {
  const pathname = usePathname()

  // Determine active item from pathname
  const getActiveKey = () => {
    if (pathname.includes('/approval')) return 'approval'
    if (pathname.includes('/results')) return 'results'
    if (pathname.includes('/gallery')) return 'gallery'
    if (pathname.includes('/edit-queue')) return 'edit-queue'
    if (pathname.includes('/edit-image')) return 'edit-queue'
    if (pathname.includes('/history')) return 'history'
    return 'brief'
  }

  const activeKey = getActiveKey()
  
  // Define workflow order
  const workflowOrder = ['brief', 'approval', 'results']
  
  // Check if a step is completed based on current page
  const isStepCompleted = (stepKey: string) => {
    const currentIndex = workflowOrder.indexOf(activeKey)
    const stepIndex = workflowOrder.indexOf(stepKey)
    
    // A step is completed if it comes before the current active step in the workflow
    return stepIndex !== -1 && currentIndex !== -1 && stepIndex < currentIndex
  }

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
                  <Image
                    src="/logo-transparent-full.png"
                    alt="Factify"
                    width={18}
                    height={18}
                    className="drop-shadow-sm"
                    priority
                  />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">{projectName ?? "Project"}</span>
                  <span className="truncate text-xs text-muted-foreground">Creative Project</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        {/* Workflow Section */}
        <div className="px-2 py-2">
          <div className="px-2 pb-2 text-xs font-medium text-muted-foreground group-data-[collapsible=icon]:hidden">
            Workflow
          </div>
          <SidebarMenu>
            {workflowItems.map((item) => {
              const isActive = activeKey === item.key
              const isCompleted = isStepCompleted(item.key)
              const href = `/dashboard/projects/${projectId}${item.href}`
              
              return (
                <SidebarMenuItem key={item.key}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive}
                    tooltip={item.description}
                  >
                    <Link href={href}>
                      <item.icon />
                      <span>{item.label}</span>
                      {isCompleted && (
                        <CheckCircle className="ml-auto size-4 text-green-500" />
                      )}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )
            })}
          </SidebarMenu>
        </div>

        <Separator className="my-2" />

        {/* Project Management Section */}
        <div className="px-2 py-2">
          <div className="px-2 pb-2 text-xs font-medium text-muted-foreground group-data-[collapsible=icon]:hidden">
            Project
          </div>
          <SidebarMenu>
            {projectItems.map((item) => {
              const isActive = activeKey === item.key
              const href = `/dashboard/projects/${projectId}${item.href}`
              
              return (
                <SidebarMenuItem key={item.key}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive}
                    tooltip={item.description}
                  >
                    <Link href={href}>
                      <item.icon />
                      <span>{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )
            })}
          </SidebarMenu>
        </div>
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  )
}

