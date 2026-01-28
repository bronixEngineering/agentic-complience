"use client"

import { useState } from "react"
import {
  Grid2X2,
  ImagePlus,
  ImageOff,
  Layers,
  Settings,
  Sparkles,
  Wand2,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { GenerateAdForm } from "./GenerateAdForm"

const sideNav = [
  { label: "Create", icon: Sparkles, active: true },
  { label: "Media", icon: ImagePlus },
  { label: "Styles", icon: Wand2 },
  { label: "Layers", icon: Layers },
  { label: "Settings", icon: Settings },
]

const presets = [
  { name: "Minimalist", accent: "bg-slate-700/80" },
  { name: "Tech Glitch", accent: "bg-cyan-500/70" },
  { name: "Organic", accent: "bg-amber-500/70" },
  { name: "Bold Luxe", accent: "bg-rose-500/70" },
]

const mediaItems = [
  { name: "Drop files", type: "Upload" },
  { name: "IMG_2104", type: "Image" },
  { name: "SEL_78", type: "Selected" },
  { name: "REC_09", type: "Video" },
]

export default function NewAdCanvas() {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span className="uppercase tracking-[0.24em]">Project Canvas</span>
            <Badge variant="outline">v2.0.4 beta</Badge>
          </div>
          <h1 className="text-xl font-semibold tracking-tight mt-2">Create AI Photo Ad</h1>
          <p className="text-muted-foreground text-sm max-w-2xl">
            Start with a prompt, then tune style, tone, and assets before generating your ad.
          </p>
        </div>
        <Badge variant="success" className="gap-2 w-fit">
          <span className="size-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
          System Online
        </Badge>
      </div>

      <div className="grid gap-4 lg:grid-cols-[72px_minmax(0,1fr)_320px]">
        <Card variant="glass" className="p-2">
          <div className="flex flex-col items-center gap-2">
            <Button variant="secondary" size="icon-lg">
              <Grid2X2 className="size-4" />
            </Button>
            <div className="h-px w-full bg-white/10" />
            {sideNav.map((item) => (
              <Button
                key={item.label}
                variant={item.active ? "secondary" : "ghost"}
                size="icon-lg"
                aria-label={item.label}
              >
                <item.icon className="size-4" />
              </Button>
            ))}
          </div>
        </Card>

        <div className="space-y-4">
          <Card variant="glass" className="relative overflow-hidden">
            <div className="absolute inset-0 bg-[linear-gradient(rgba(148,163,184,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.08)_1px,transparent_1px)] bg-[size:28px_28px]" />
            <CardContent className="relative p-4">
              <div className="relative aspect-video overflow-hidden rounded-xl border border-white/10 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.28),_rgba(2,6,23,0.1),_transparent_60%)]" />
                <div className="absolute inset-0 bg-[linear-gradient(120deg,_rgba(14,116,144,0.2),_transparent_40%)]" />
                {previewUrl ? (
                  <img
                    src={previewUrl}
                    alt="Generated ad preview"
                    className="absolute inset-0 h-full w-full object-contain"
                  />
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-muted-foreground">
                    <div className="rounded-full border border-white/10 bg-black/40 p-3">
                      <ImageOff className="size-5" />
                    </div>
                    <div className="text-xs uppercase tracking-[0.3em]">Preview</div>
                    <div className="text-xs text-white/50">Generated images will appear here.</div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card variant="glass">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Command input</CardTitle>
              <CardDescription>Use prompt + aspect ratio to generate.</CardDescription>
            </CardHeader>
            <CardContent>
              <GenerateAdForm onPreviewChange={setPreviewUrl} />
            </CardContent>
          </Card>

          <Card variant="glass">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Media bin</CardTitle>
              <CardDescription>Drop assets and generated outputs.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {mediaItems.map((item) => (
                <div
                  key={item.name}
                  className="flex flex-col justify-between gap-6 rounded-lg border border-white/10 bg-black/20 p-3"
                >
                  <div className="text-xs text-muted-foreground">{item.type}</div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{item.name}</span>
                    {item.type === "Selected" && <Badge variant="outline">SEL</Badge>}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <Card variant="glass">
          <CardHeader>
            <CardTitle className="text-base">Brand profile</CardTitle>
            <CardDescription>Keep ad variants on-brand.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Primary palette
              </div>
              <div className="flex items-center gap-2">
                <div className="size-6 rounded-md bg-cyan-400/80" />
                <div className="size-6 rounded-md bg-amber-400/80" />
                <div className="size-6 rounded-md bg-fuchsia-400/80" />
                <Button variant="outline" size="icon-sm">
                  <span className="text-sm">+</span>
                </Button>
              </div>
            </div>

            <Separator />

            <div className="space-y-2">
              <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Brand tone
              </div>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="secondary">
                  Bold
                </Button>
                <Button size="sm" variant="outline">
                  Playful
                </Button>
                <Button size="sm" variant="outline">
                  Minimal
                </Button>
              </div>
            </div>

            <Separator />

            <div className="space-y-2">
              <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Preset styles
              </div>
              <div className="grid gap-3">
                {presets.map((preset) => (
                  <div
                    key={preset.name}
                    className="flex items-center justify-between rounded-lg border border-white/10 bg-black/20 px-3 py-2"
                  >
                    <div className="flex items-center gap-2">
                      <div className={`size-3 rounded-full ${preset.accent}`} />
                      <span className="text-sm">{preset.name}</span>
                    </div>
                    <Badge variant="outline">Select</Badge>
                  </div>
                ))}
                <button
                  type="button"
                  className="flex items-center justify-center rounded-lg border border-dashed border-white/20 bg-black/10 px-3 py-4 text-xs text-muted-foreground transition hover:text-foreground"
                >
                  + Add preset
                </button>
              </div>
            </div>

            <Button className="w-full">Generate variations</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
