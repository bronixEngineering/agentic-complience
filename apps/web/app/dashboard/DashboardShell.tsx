"use client"

import * as React from "react"
import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useTransition } from "react"

import { AppSidebar } from "@/components/app-sidebar"
import { ProjectSidebar } from "@/components/project-sidebar"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { ThemeToggle } from "@/components/theme-toggle"
import { signOut } from "@/app/actions/auth"

function breadcrumbForPath(pathname: string) {
  if (pathname === "/dashboard") {
    return { parent: "Dashboard", page: "Projects" }
  }
  if (pathname.startsWith("/dashboard/workflow")) {
    return { parent: "Dashboard", page: "Workflow" }
  }
  if (pathname.startsWith("/dashboard/projects")) {
    const projectId = pathname.split("/")[3]
    return { parent: "Dashboard", page: projectId ? `Project ${projectId}` : "Project" }
  }
  return { parent: "Dashboard", page: "Overview" }
}

export default function DashboardShell({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const [isPending, startTransition] = useTransition()
  const crumbs = breadcrumbForPath(pathname)
  const isProjectDetail = pathname.startsWith("/dashboard/projects/")
  const projectId = isProjectDetail ? pathname.split("/")[3] : undefined

  const handleSignOut = () => {
    startTransition(() => {
      signOut()
    })
  }

  return (
    <SidebarProvider>
      {isProjectDetail && projectId ? (
        <ProjectSidebar projectId={projectId} />
      ) : (
        <AppSidebar />
      )}
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b">
          <div className="flex flex-1 items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator
              orientation="vertical"
              className="mr-2 data-[orientation=vertical]:h-4"
            />
            <Link
              href="/dashboard"
              className="hover:bg-muted/30 focus-visible:ring-ring/50 rounded-md p-1 outline-none focus-visible:ring-[3px]"
              aria-label="Go to dashboard"
            >
              <Image
                src="/logo-transparent-full.png"
                alt="Factify"
                width={18}
                height={18}
                className="drop-shadow-sm"
                priority
              />
            </Link>
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbLink href="/dashboard">{crumbs.parent}</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem>
                  <BreadcrumbPage>{crumbs.page}</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>

          <div className="flex items-center gap-2 px-4">
            <ThemeToggle />
            <Button
              variant="secondary"
              onClick={handleSignOut}
              disabled={isPending}
            >
              {isPending ? "Signing out..." : "Sign out"}
            </Button>
          </div>
        </header>

        <div className="flex flex-1 flex-col gap-4 p-4 pt-4">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  )
}

