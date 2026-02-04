"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"

export function useProject(projectId: string | undefined) {
  const [projectName, setProjectName] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [completedSteps, setCompletedSteps] = useState<string[]>([])

  useEffect(() => {
    if (!projectId) {
      setLoading(false)
      return
    }

    const fetchProject = async () => {
      try {
        const supabase = createClient()
        
        // Fetch project name
        const { data, error } = await supabase
          .from("projects")
          .select("name")
          .eq("id", projectId)
          .single()

        if (!error && data) {
          setProjectName(data.name)
        }

        // Fetch workflow executions to determine completed steps
        const { data: executions } = await supabase
          .from("workflow_executions")
          .select("status, brief_version_id")
          .eq("project_id", projectId)
          .order("started_at", { ascending: false })
          .limit(1)
          .single()

        const completed: string[] = []

        // Check if brief was created
        if (executions?.brief_version_id) {
          completed.push("brief")
        }

        // Check if brief was approved (workflow passed suspended state)
        if (executions && ["completed", "running"].includes(executions.status)) {
          completed.push("approval")
        }

        // Check if images were generated
        if (executions?.status === "completed") {
          const { data: images } = await supabase
            .from("project_content")
            .select("id")
            .eq("project_id", projectId)
            .eq("content_type", "generated_image")
            .limit(1)

          if (images && images.length > 0) {
            completed.push("results")
          }
        }

        setCompletedSteps(completed)
      } catch (err) {
        console.error("Failed to fetch project:", err)
      } finally {
        setLoading(false)
      }
    }

    fetchProject()
  }, [projectId])

  return { projectName, loading, completedSteps }
}
