"use client"

import * as React from "react"
import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import {
  ArrowLeft,
  FileText,
  CheckCircle,
  Sparkles,
  Images,
  Clock,
  Edit3,
  Loader2,
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
import { useWorkflowState, WorkflowStep } from "@/hooks/useWorkflowState"
import { cn } from "@/lib/utils"

const workflowItems = [
  { 
    key: "brief" as WorkflowStep, 
    label: "Create Brief", 
    icon: FileText, 
    href: "",
    description: "Write your creative brief"
  },
  { 
    key: "approval" as WorkflowStep, 
    label: "Review Brief", 
    icon: CheckCircle, 
    href: "/approval",
    description: "Review AI-enhanced brief"
  },
  { 
    key: "results" as WorkflowStep, 
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
}: {
  projectId: string
  projectName?: string
}) {
  const pathname = usePathname()
  const { isLoading, status, currentStep } = useWorkflowState(projectId)
  
  // Define workflow order for completion checking
  const workflowOrder: WorkflowStep[] = ['brief', 'approval', 'results']

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
  
  // Check if a step is completed based on workflow status
  const isStepCompleted = (stepKey: WorkflowStep): boolean => {
    if (isLoading) return false
    
    const currentIndex = workflowOrder.indexOf(currentStep)
    const stepIndex = workflowOrder.indexOf(stepKey)
    
    // A step is completed if it comes before the current step in the workflow
    return stepIndex !== -1 && currentIndex !== -1 && stepIndex < currentIndex
  }
  
  // Check if step is currently active (running)
  const isStepRunning = (stepKey: WorkflowStep): boolean => {
    if (isLoading) return false
    return currentStep === stepKey && status === 'running'
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
            {status === 'running' && (
              <span className="ml-2 inline-flex items-center gap-1 text-primary">
                <Loader2 className="size-3 animate-spin" />
                <span>Processing</span>
              </span>
            )}
            {status === 'suspended' && (
              <span className="ml-2 text-amber-500">
                • Awaiting Review
              </span>
            )}
          </div>
          <SidebarMenu>
            {workflowItems.map((item) => {
              const isActive = activeKey === item.key
              const isCompleted = isStepCompleted(item.key)
              const isRunning = isStepRunning(item.key)
              const href = `/dashboard/projects/${projectId}${item.href}`
              
              return (
                <SidebarMenuItem key={item.key}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive}
                    tooltip={item.description}
                  >
                    <Link href={href}>
                      <item.icon className={cn(
                        isRunning && "text-primary"
                      )} />
                      <span>{item.label}</span>
                      {isCompleted && (
                        <CheckCircle className="ml-auto size-4 text-green-500" />
                      )}
                      {isRunning && (
                        <Loader2 className="ml-auto size-4 animate-spin text-primary" />
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
