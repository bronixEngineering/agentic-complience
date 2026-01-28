"use client"

import { useState, useEffect, type FormEvent } from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

const aspectRatioOptions = [
  "21:9",
  "16:9",
  "3:2",
  "4:3",
  "5:4",
  "1:1",
  "4:5",
  "3:4",
  "2:3",
  "9:16",
]

type ImageFile = {
  file_name: string
  content_type: string
  url: string
}

type NanoBananaResult = {
  images: ImageFile[]
  description: string
}

type GenerateAdFormProps = {
  onPreviewChange?: (url: string | null) => void
}

export function GenerateAdForm({ onPreviewChange }: GenerateAdFormProps) {
  const [prompt, setPrompt] = useState("")
  const [aspectRatio, setAspectRatio] = useState("1:1")
  const [result, setResult] = useState<NanoBananaResult | null>(null)
  const [selectedUrl, setSelectedUrl] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (result?.images?.length) {
      setSelectedUrl(result.images[0].url)
    }
  }, [result])

  useEffect(() => {
    onPreviewChange?.(selectedUrl)
  }, [selectedUrl, onPreviewChange])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)

    const trimmedPrompt = prompt.trim()
    if (trimmedPrompt.length < 8) {
      setError("Add a more detailed prompt to generate the image.")
      return
    }

    try {
      setIsLoading(true)
      const response = await fetch("/api/nanobanana", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: trimmedPrompt,
          aspect_ratio: aspectRatio,
        }),
      })

      const payload = (await response.json()) as NanoBananaResult & { error?: string }
      if (!response.ok) {
        throw new Error(payload?.error || "Unable to generate the image.")
      }

      setResult(payload)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <form className="flex flex-col gap-3 md:flex-row md:items-start" onSubmit={handleSubmit}>
        <div className="flex-1 space-y-3">
          <div className="space-y-2">
            <label
              htmlFor="nanobanana-prompt"
              className="text-xs font-semibold uppercase tracking-widest text-muted-foreground"
            >
              Prompt
            </label>
            <textarea
              id="nanobanana-prompt"
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              className="min-h-[110px] w-full rounded-md border border-white/10 bg-black/40 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground shadow-xs outline-none transition-all focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
              placeholder="Describe the ad scene, lighting, subject, and tone..."
            />
            <p className="text-xs text-muted-foreground">
              User gonna prompt the text here. The richer the prompt, the better the result.
            </p>
          </div>

          <div className="space-y-2">
            <label
              htmlFor="nanobanana-aspect"
              className="text-xs font-semibold uppercase tracking-widest text-muted-foreground"
            >
              Aspect ratio
            </label>
            <select
              id="nanobanana-aspect"
              value={aspectRatio}
              onChange={(event) => setAspectRatio(event.target.value)}
              className="h-9 w-full rounded-md border border-white/10 bg-black/40 px-3 text-sm text-foreground shadow-xs outline-none transition-all focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
            >
              {aspectRatioOptions.map((ratio) => (
                <option key={ratio} value={ratio} className="bg-slate-950">
                  {ratio}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex w-full flex-col gap-2 md:w-44">
          <Button type="submit" disabled={isLoading}>
            {isLoading ? "Generating..." : "Generate"}
          </Button>
          <Badge variant="outline" className="justify-center">
            {isLoading ? "Processing" : "Ready"}
          </Badge>
        </div>
      </form>

      {error && <div className="text-xs text-red-300">{error}</div>}

      {result?.images?.length ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Generated output
            </span>
            <Badge variant="outline">{result.images.length} image</Badge>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {result.images.map((image) => (
              <button
                type="button"
                key={image.url}
                onClick={() => setSelectedUrl(image.url)}
                className={`overflow-hidden rounded-lg border bg-black/30 text-left transition ${
                  selectedUrl === image.url
                    ? "border-cyan-400/70 ring-1 ring-cyan-400/60"
                    : "border-white/10 hover:border-white/30"
                }`}
              >
                <img src={image.url} alt={image.file_name} className="h-40 w-full object-cover" />
                <div className="px-3 py-2 text-xs text-muted-foreground">{image.file_name}</div>
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  )
}
