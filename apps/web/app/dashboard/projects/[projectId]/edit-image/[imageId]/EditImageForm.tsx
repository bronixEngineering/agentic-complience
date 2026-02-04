"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

import { Loader2 } from "lucide-react";

interface EditImageFormProps {
  projectId: string;
  sourceImageUrl: string;
  imageId: string;
  projectName: string;
}

export function EditImageForm({ projectId, sourceImageUrl, imageId, projectName }: EditImageFormProps) {
  const router = useRouter();
  const [prompt, setPrompt] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [generatedImages, setGeneratedImages] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleEdit = async () => {
    if (!prompt) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/nanobanana/edit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt,
          image_url: sourceImageUrl,
          projectId,
          imageId, // Passing original image ID
        }),
      });

      const data = await response.json();
      console.log("[EditImageForm] API Response:", data);

      if (!response.ok) {
        throw new Error(data.error || "Failed to edit image");
      }

      if (data.createdIds && data.createdIds.length > 0) {
        console.log("[EditImageForm] Redirecting to comparison:", data.createdIds[0]);
        // Redirect to comparison page
        router.push(`/dashboard/projects/${projectId}/edit-image/${imageId}/compare/${data.createdIds[0]}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="text-muted-foreground text-sm">Project: {projectName}</div>
          <h1 className="text-lg font-semibold tracking-tight">Edit Image</h1>
        </div>
        <Button variant="secondary" asChild disabled={isLoading}>
          <Link href={`/dashboard/projects/${projectId}/select-image`}>Back to Selection</Link>
        </Button>
      </div>

      {/* Before / After Comparison - Only shown after generation */}
      {generatedImages.length > 0 && (
        <div className="animate-in fade-in slide-in-from-top-4 duration-700">
           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card variant="glass" className="overflow-hidden border-primary/20">
                <div className="p-2 bg-muted/30 text-xs font-semibold uppercase tracking-wider text-center border-b border-border">
                  Before (Original)
                </div>
                <div className="aspect-square relative bg-black/5">
                  <Image
                    src={sourceImageUrl}
                    alt="Original"
                    fill
                    className="object-contain"
                    unoptimized
                  />
                </div>
              </Card>

              <Card variant="glass" className="overflow-hidden ring-2 ring-primary bg-primary/5">
                <div className="p-2 bg-primary/10 text-xs font-bold uppercase tracking-wider text-center border-b border-primary/20 text-primary">
                  After (Edited)
                </div>
                <div className="aspect-square relative bg-black/5">
                  <Image
                    src={generatedImages[0].url}
                    alt="Edited result"
                    fill
                    className="object-contain"
                    unoptimized
                  />
                </div>
              </Card>
           </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Source Image - only shown before generation if we don't have results yet */}
        {!generatedImages.length && (
          <Card variant="glass">
            <CardContent className="p-4 space-y-4">
              <div className="font-semibold text-sm text-muted-foreground uppercase tracking-tight">Original Image</div>
              <div className="aspect-square relative rounded-md overflow-hidden bg-muted/20 border border-border/50">
                <Image
                  src={sourceImageUrl}
                  alt="Original"
                  fill
                  className="object-contain"
                  unoptimized
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Controls */}
        <Card variant="glass" className={cn(generatedImages.length > 0 && "md:col-span-2")}>
          <CardContent className="p-6 space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="prompt" className="text-base">What would you like to change?</Label>
                <Input
                  id="prompt"
                  placeholder="e.g. Add a mountain range in the background with a snowy peak"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  className="h-12 bg-background/50"
                />
                <p className="text-xs text-muted-foreground">
                  Minimum 8 characters. Be descriptive for better results.
                </p>
              </div>

              {error && (
                <div className="text-sm text-red-500 bg-red-500/10 p-3 rounded-md border border-red-500/20">
                  {error}
                </div>
              )}

              <Button 
                onClick={handleEdit} 
                disabled={isLoading || prompt.length < 8} 
                className="w-full h-12 text-sm font-semibold"
                variant={generatedImages.length > 0 ? "secondary" : "default"}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Editing image...
                  </>
                ) : (
                  generatedImages.length > 0 ? "Generate Another Version" : "Generate New Version"
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Additional Results (if multiple) */}
      {generatedImages.length > 1 && (
        <div className="space-y-4 pt-8">
          <h2 className="text-xl font-semibold">Additional Versions</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {generatedImages.slice(1).map((img, idx) => (
              <Card key={idx} variant="glass" className="overflow-hidden hover:ring-2 hover:ring-primary transition-all cursor-pointer">
                <div className="aspect-square relative">
                  <Image
                    src={img.url}
                    alt={`Edited version ${idx + 2}`}
                    fill
                    className="object-contain"
                    unoptimized
                  />
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Back to Results Button */}
      {generatedImages.length > 0 && (
          <div className="flex justify-center pt-4">
              <Button variant="outline" onClick={() => router.push(`/dashboard/projects/${projectId}/results`)}>
                  Back to All Results
              </Button>
          </div>
      )}
    </div>
  );
}
