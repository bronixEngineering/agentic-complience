import {
  ArrowUpRight,
  ImagePlus,
  Palette,
  Sparkles,
  Wand2,
} from "lucide-react"
import Link from "next/link"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"

type AdStatus = "Live" | "In Review" | "Draft" | "Scheduled"

const heroStats = [
  { label: "Active ads", value: "24" },
  { label: "Variants", value: "128" },
  { label: "Nanobanana Pro", value: "Online" },
]

const creationSteps = [
  {
    title: "Add image",
    description: "Upload or generate a base photo",
    icon: ImagePlus,
    tone: "from-amber-200/80 via-orange-300/60 to-rose-300/70",
  },
  {
    title: "Choose style",
    description: "Pick a preset for tone + lighting",
    icon: Sparkles,
    tone: "from-slate-900/60 via-slate-800/70 to-slate-900/80",
  },
  {
    title: "Generate ads",
    description: "Create multiple variants instantly",
    icon: Wand2,
    tone: "from-sky-800/60 via-cyan-700/50 to-slate-900/70",
  },
]

const adGallery = [
  {
    title: "Infinite Possibilities",
    status: "Live" as AdStatus,
    category: "Lifestyle",
    prompt: "Portrait with cinematic glow and deep shadows",
    gradient: "from-slate-900 via-slate-800 to-slate-950",
  },
  {
    title: "Urban Signals",
    status: "In Review" as AdStatus,
    category: "Outdoors",
    prompt: "Wide street with neon signage and crisp detail",
    gradient: "from-slate-800 via-slate-900 to-black",
  },
  {
    title: "Cyber Couture",
    status: "Scheduled" as AdStatus,
    category: "Fashion",
    prompt: "High contrast studio, minimal silhouette",
    gradient: "from-slate-900 via-zinc-900 to-slate-950",
  },
  {
    title: "Particle Dissolve",
    status: "Draft" as AdStatus,
    category: "Concept",
    prompt: "Soft volumetric light, suspended dust",
    gradient: "from-slate-800 via-slate-900 to-slate-950",
  },
  {
    title: "Organic Motion",
    status: "Live" as AdStatus,
    category: "Sports",
    prompt: "Dynamic motion trails, warm highlights",
    gradient: "from-amber-900/70 via-orange-900/60 to-slate-950",
  },
  {
    title: "Minimal Luxe",
    status: "Draft" as AdStatus,
    category: "Product",
    prompt: "Clean studio backdrop with soft shadows",
    gradient: "from-zinc-800 via-neutral-900 to-slate-950",
  },
]

const presets = [
  { name: "Minimalist", accent: "bg-slate-800/80" },
  { name: "Tech Glitch", accent: "bg-cyan-500/60" },
  { name: "Organic", accent: "bg-amber-500/50" },
  { name: "Bold Luxe", accent: "bg-rose-500/50" },
]

const statusVariant: Record<AdStatus, "success" | "warning" | "secondary" | "outline"> = {
  Live: "success",
  "In Review": "warning",
  Draft: "secondary",
  Scheduled: "outline",
}

export default function AdsHome() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="gap-1">
              <Sparkles className="size-3.5" />
              Nanobanana Pro
            </Badge>
            <Badge variant="secondary">AI Photo Ads</Badge>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight mt-3">Ad Studio</h1>
          <p className="text-muted-foreground text-sm max-w-2xl">
            Create high-performing photo ads with studio-grade presets, brand-safe palettes,
            and rapid iterations. This is the homepage for every ad we create.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="glass">Import brief</Button>
          <Button asChild>
            <Link href="/dashboard/ads/new">
              New ad
              <ArrowUpRight className="size-4" />
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-4">
          <Card variant="glass" className="relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.25),_rgba(15,23,42,0.15),_rgba(2,6,23,0.4))]" />
            <CardContent className="relative grid gap-6 p-6 md:grid-cols-[1.2fr_1fr]">
              <div className="space-y-4">
                <div>
                  <CardTitle className="text-xl">Infinite possibilities, unified brand tone.</CardTitle>
                  <CardDescription>
                    Generate ad-ready imagery, then branch into photo creation, editing, and
                    multi-format outputs. We start here, then expand.
                  </CardDescription>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button>Generate concept</Button>
                  <Button variant="outline">Explore gallery</Button>
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  {heroStats.map((stat) => (
                    <div
                      key={stat.label}
                      className="rounded-lg border border-white/10 bg-black/30 p-3 backdrop-blur-sm"
                    >
                      <div className="text-xs text-muted-foreground">{stat.label}</div>
                      <div className="text-sm font-semibold">{stat.value}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="grid gap-3">
                {creationSteps.map((step) => (
                  <div
                    key={step.title}
                    className="rounded-xl border border-white/10 bg-black/20 p-4"
                  >
                    <div className={`rounded-lg bg-gradient-to-br ${step.tone} p-4`}>
                      <div className="flex items-center justify-between">
                        <step.icon className="size-5 text-white" />
                        <Badge variant="outline" className="border-white/30 text-white/90">
                          Step
                        </Badge>
                      </div>
                      <div className="mt-4 space-y-1 text-white">
                        <div className="text-sm font-semibold">{step.title}</div>
                        <div className="text-xs text-white/70">{step.description}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">Ad gallery</h2>
                <p className="text-muted-foreground text-sm">
                  Browse, filter, and refine the ads you create.
                </p>
              </div>
              <Button variant="outline" size="sm">
                View all
              </Button>
            </div>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {adGallery.map((ad) => (
                <Card key={ad.title} variant="glass" className="group overflow-hidden">
                  <div
                    className={`aspect-[4/3] w-full bg-gradient-to-br ${ad.gradient} p-4`}
                  >
                    <div className="flex items-start justify-between">
                      <Badge variant="outline" className="border-white/20 text-white/90">
                        {ad.category}
                      </Badge>
                      <Badge variant={statusVariant[ad.status]}>{ad.status}</Badge>
                    </div>
                    <div className="mt-auto flex h-full flex-col justify-end">
                      <div className="text-white">
                        <div className="text-sm font-semibold">{ad.title}</div>
                        <div className="text-xs text-white/70">{ad.prompt}</div>
                      </div>
                    </div>
                  </div>
                  <CardContent className="flex items-center justify-between gap-2 p-4">
                    <div className="text-xs text-muted-foreground">Last edited 2 hours ago</div>
                    <Button variant="ghost" size="sm">
                      Open
                      <ArrowUpRight className="size-3.5" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <Card variant="glass">
            <CardHeader>
              <CardTitle className="text-base">Studio sidebar</CardTitle>
              <CardDescription>Ad controls, prompts, and brand profile.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  Brand profile
                </div>
                <div className="flex items-center gap-2">
                  <div className="size-6 rounded-md bg-cyan-400/80" />
                  <div className="size-6 rounded-md bg-amber-400/80" />
                  <div className="size-6 rounded-md bg-fuchsia-400/80" />
                  <div className="size-6 rounded-md bg-emerald-400/80" />
                  <Button variant="outline" size="icon-sm">
                    <Palette className="size-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary">Bold</Badge>
                  <Badge variant="outline">Playful</Badge>
                  <Badge variant="outline">Minimal</Badge>
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  Prompt
                </div>
                <Input placeholder="Describe the scene for Nanobanana Pro…" />
                <div className="text-xs text-muted-foreground">
                  Example: Cinematic ad for a luxury watch with teal rim lighting and 4K detail.
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  Preset styles
                </div>
                <div className="grid gap-2">
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
                </div>
              </div>

              <Button className="w-full">Generate ad variations</Button>
            </CardContent>
          </Card>

          <Card variant="glass">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Next up</CardTitle>
              <CardDescription>Photo creation, editing, and deployment stages.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <div className="flex items-center justify-between rounded-lg border border-white/10 bg-black/20 px-3 py-2">
                <span>Photo creation page</span>
                <Badge variant="outline">Planned</Badge>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-white/10 bg-black/20 px-3 py-2">
                <span>Editing suite</span>
                <Badge variant="outline">Planned</Badge>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-white/10 bg-black/20 px-3 py-2">
                <span>Ad delivery & QA</span>
                <Badge variant="outline">Planned</Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
