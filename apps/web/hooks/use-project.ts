"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"

export function useProject(projectId: string | undefined) {
  const [projectName, setProjectName] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!projectId) {
      setLoading(false)
      return
    }

    const fetchProject = async () => {
      try {
        const supabase = createClient()
        const { data, error } = await supabase
          .from("projects")
          .select("name")
          .eq("id", projectId)
          .single()

        if (!error && data) {
          setProjectName(data.name)
        }
      } catch (err) {
        console.error("Failed to fetch project:", err)
      } finally {
        setLoading(false)
      }
    }

    fetchProject()
  }, [projectId])

  return { projectName, loading }
}
