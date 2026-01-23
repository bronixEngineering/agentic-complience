"use client"

import * as React from "react"
import { useEffect, useState } from "react"
import Image from "next/image"
import {
  Frame,
  LayoutDashboard,
  ListChecks,
  ShieldCheck,
} from "lucide-react"

import { NavMain } from "@/components/nav-main"
import { NavProjects } from "@/components/nav-projects"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { createClient } from "@/lib/supabase/client"

const data = {
  navMain: [
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: LayoutDashboard,
      isActive: true,
    },
    {
      title: "Workflow",
      url: "/dashboard/workflow",
      icon: ListChecks,
    },
    {
      title: "Compliance",
      url: "/dashboard/compliance",
      icon: ShieldCheck,
    },
  ],
}

function displayNameFromUser(user: any) {
  const md = (user?.user_metadata ?? {}) as Record<string, unknown>
  const name =
    (md["full_name"] as string | undefined) ||
    (md["name"] as string | undefined) ||
    (md["display_name"] as string | undefined)
  return (name && name.trim()) || (user?.email as string | undefined) || "User"
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const [userInfo, setUserInfo] = useState<{
    name: string
    email: string
    avatar?: string
  } | null>(null)
  const [projects, setProjects] = useState<{ name: string; url: string; icon: typeof Frame }[]>(
    []
  )
  const [projectsLoading, setProjectsLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        setProjectsLoading(true)
        const supabase = createClient()

        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (!user) {
          if (!cancelled) setUserInfo(null)
          if (!cancelled) setProjects([])
          return
        }

        const md = (user.user_metadata ?? {}) as Record<string, unknown>
        const avatar =
          (md["avatar_url"] as string | undefined) ||
          (md["picture"] as string | undefined) ||
          undefined

        if (!cancelled) {
          setUserInfo({
            name: displayNameFromUser(user),
            email: user.email ?? "",
            avatar,
          })
        }

        const { data: rows, error } = await supabase
          .from("projects")
          .select("id,name,updated_at")
          .order("updated_at", { ascending: false })
          .limit(12)

        if (error) {
          if (!cancelled) setProjects([])
          return
        }

        const items =
          rows?.map((p) => ({
            name: p.name as string,
            url: `/dashboard/projects/${p.id}`,
            icon: Frame,
          })) ?? []

        if (!cancelled) setProjects(items)
      } finally {
        if (!cancelled) setProjectsLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <Sidebar variant="inset" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <a href="/dashboard">
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
                  <span className="truncate font-medium">Factify</span>
                  <span className="truncate text-xs">AI compliance</span>
                </div>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
        <NavProjects projects={projects} isLoading={projectsLoading} />
      </SidebarContent>
      <SidebarFooter>
        {userInfo && <NavUser user={userInfo} />}
        <div className="px-3 pb-3 pt-2 text-xs text-muted-foreground group-data-[collapsible=icon]:hidden">
          <div className="flex items-center gap-2">
            <Image
              src="/logo-transparent-full.png"
              alt="Factify"
              width={14}
              height={14}
            />
            <span className="truncate">Factify</span>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}
