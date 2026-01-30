"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Download, ExternalLink, Loader2, RefreshCw, Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface ImageData {
  url: string;
  file_name?: string;
  content_type?: string;
  persona?: string;
}

export default function ResultsPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.projectId as string;

  const [images, setImages] = useState<ImageData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchResults() {
      try {
        const res = await fetch(`/api/nanobanana/status?projectId=${projectId}`);
        if (!res.ok) {
          throw new Error("Failed to fetch results");
        }
        const data = await res.json();

        // Check for images first - if we have images, show them regardless of reported status
        // This handles race conditions where DB status hasn't updated yet
        if (data.images && data.images.length > 0) {
          setImages(data.images);
        } else if (data.status === "completed") {
          // Completed but no images - show message
          setError("Generation completed but no images were produced.");
        } else if (data.status === "suspended") {
          // Still needs approval, redirect to approval page
          router.replace(`/dashboard/projects/${projectId}/approval`);
          return;
        } else if (data.status === "running") {
          // Still running, stay on page and poll
          setError("Generation is still in progress. Please wait...");
        } else if (data.status === "none") {
          // No execution, redirect to brief page
          router.replace(`/dashboard/projects/${projectId}`);
          return;
        } else {
          // Unknown state, show error
          setError("Unable to load results. Please try refreshing.");
        }
      } catch (err) {
        console.error("Error fetching results:", err);
        setError("Failed to load results. Please try again.");
      } finally {
        setIsLoading(false);
      }
    }

    fetchResults();
  }, [projectId, router]);

  const handleDownload = async (imageUrl: string, fileName: string) => {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName || "generated-image.png";
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error("Download failed:", err);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Loading results...</p>
        </div>
      </div>
    );
  }

  if (error && images.length === 0) {
    return (
      <div className="space-y-4">
        <Card className="border-destructive/50 bg-destructive/5">
          <CardHeader>
            <CardTitle className="text-destructive">Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{error}</p>
            <div className="flex gap-2 mt-4">
              <Button variant="outline" asChild>
                <Link href={`/dashboard/projects/${projectId}`}>
                  <ArrowLeft className="mr-2 size-4" />
                  Back to Brief
                </Link>
              </Button>
              <Button variant="outline" onClick={() => window.location.reload()}>
                <RefreshCw className="mr-2 size-4" />
                Refresh
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Button variant="ghost" size="sm" asChild className="mb-2">
            <Link href={`/dashboard/projects/${projectId}`}>
              <ArrowLeft className="mr-2 size-4" />
              Back to Brief
            </Link>
          </Button>
          <h1 className="text-2xl font-semibold tracking-tight">Generated Images</h1>
          <p className="text-sm text-muted-foreground">
            Your creative assets have been generated successfully.
          </p>
        </div>
        <Button onClick={() => router.push(`/dashboard/projects/${projectId}`)}>
          <RefreshCw className="mr-2 size-4" />
          Generate New
        </Button>
      </div>

      {/* Success Banner */}
      <Card className="border-green-500/50 bg-green-500/5">
        <CardContent className="flex items-center gap-3 py-4">
          <div className="flex size-8 items-center justify-center rounded-full bg-green-500/20">
            <Check className="size-4 text-green-500" />
          </div>
          <div>
            <p className="font-medium text-green-500">Generation Complete</p>
            <p className="text-sm text-muted-foreground">
              {images.length} image{images.length !== 1 ? "s" : ""} generated successfully
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Image Gallery */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {images.map((image, index) => (
          <Card key={index} className="overflow-hidden">
            <div className="relative aspect-[4/5] bg-muted">
              <Image
                src={image.url}
                alt={`Generated image ${index + 1}`}
                fill
                className="object-cover"
                unoptimized // External URLs need this
              />
            </div>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  {image.persona && (
                    <span className="capitalize">{image.persona.replace(/-/g, " ")}</span>
                  )}
                  {!image.persona && <span>Image {index + 1}</span>}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDownload(image.url, image.file_name || `image-${index + 1}.png`)}
                  >
                    <Download className="size-4" />
                  </Button>
                  <Button variant="ghost" size="icon" asChild>
                    <a href={image.url} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="size-4" />
                    </a>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
