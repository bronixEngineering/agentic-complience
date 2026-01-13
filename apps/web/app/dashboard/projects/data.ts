export type Project = {
  id: string
  name: string
  status: "Draft" | "In Review" | "Paused" | "Complete"
  updatedAt: string
  brandDomain: string
  channels: ("Website" | "Instagram" | "Facebook" | "YouTube" | "LinkedIn" | "X")[]
  progressPct: number
  phasesComplete: number
  phasesTotal: number
  warnings: number
  risks: number
  lastEvent: string
}

export const demoProjects: Project[] = [
  {
    id: "p_1",
    name: "Summer Campaign 2025",
    status: "Draft",
    updatedAt: "Today",
    brandDomain: "yourcompany.com",
    channels: ["Instagram", "Facebook", "Website"],
    progressPct: 12,
    phasesComplete: 1,
    phasesTotal: 6,
    warnings: 0,
    risks: 0,
    lastEvent: "Brief draft started",
  },
  {
    id: "p_2",
    name: "Q1 Product Launch",
    status: "In Review",
    updatedAt: "Yesterday",
    brandDomain: "acme.com",
    channels: ["Website", "LinkedIn", "X"],
    progressPct: 58,
    phasesComplete: 3,
    phasesTotal: 6,
    warnings: 2,
    risks: 1,
    lastEvent: "Platform compliance scan flagged claims",
  },
  {
    id: "p_3",
    name: "Brand Refresh — Social Pack",
    status: "Paused",
    updatedAt: "3 days ago",
    brandDomain: "brand.io",
    channels: ["Instagram", "YouTube"],
    progressPct: 34,
    phasesComplete: 2,
    phasesTotal: 6,
    warnings: 1,
    risks: 0,
    lastEvent: "Licensed content requires verification",
  },
]

export type ComplianceEvent = {
  id: string
  projectId: string
  projectName: string
  phase: "Setup" | "Goals" | "Analysis" | "Compliance" | "Perception" | "Export"
  title: string
  severity: "info" | "warning" | "risk"
  when: string
}

export const demoComplianceEvents: ComplianceEvent[] = [
  {
    id: "e_1",
    projectId: "p_2",
    projectName: "Q1 Product Launch",
    phase: "Compliance",
    title: "Misleading claims flagged (High Risk)",
    severity: "risk",
    when: "2h ago",
  },
  {
    id: "e_2",
    projectId: "p_3",
    projectName: "Brand Refresh — Social Pack",
    phase: "Analysis",
    title: "Licensed content needs verification",
    severity: "warning",
    when: "Yesterday",
  },
  {
    id: "e_3",
    projectId: "p_1",
    projectName: "Summer Campaign 2025",
    phase: "Setup",
    title: "Project created",
    severity: "info",
    when: "Today",
  },
]

export function getProjectById(id: string) {
  return demoProjects.find((p) => p.id === id)
}

