import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function WorkflowPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Workflow</h1>
        <p className="text-muted-foreground text-sm">
          UI placeholder — next we’ll port the Phase 1–4 screens here.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Phase 1 — Project Setup</CardTitle>
            <CardDescription>Project name, creative input, brief, channels</CardDescription>
          </CardHeader>
          <CardContent className="text-muted-foreground text-sm">
            Coming next: the exact UI you described (brief sections + channel selection).
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Phase 3 — Content Analysis</CardTitle>
            <CardDescription>AI detection, licensing, brand alignment</CardDescription>
          </CardHeader>
          <CardContent className="text-muted-foreground text-sm">
            We’ll add charts, confidence indicators, and warnings/approval controls.
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

