"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Download, ExternalLink, Loader2, RefreshCw, Check, Paintbrush, X, Eye } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface ImageData {
  id?: string;
  url: string;
  file_name?: string;
  content_type?: string;
  persona?: string;
  aspect_ratio?: string;
}

export default function ResultsPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.projectId as string;

  const [images, setImages] = useState<ImageData[]>([]);
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<ImageData | null>(null);
  const [isGenerating, setIsGenerating] = useState(true); // Start as true for immediate loading UI
  const [generationMessage, setGenerationMessage] = useState<string>("Preparing your images...");
  const [isSuccessInfo, setIsSuccessInfo] = useState(false);

  useEffect(() => {
    // Single fetch on mount - no continuous polling
    // Approval page handles waiting for workflow completion
    async function fetchResults() {
      try {
        const res = await fetch(`/api/nanobanana/status?projectId=${projectId}`);
        if (!res.ok) {
          throw new Error("Failed to fetch results");
        }
        const data = await res.json();

        // Check for images
        if (data.images && data.images.length > 0) {
          setImages(data.images);
          setIsGenerating(false);
          setIsLoading(false);
          return;
        }

        // Handle different statuses
        if (data.status === "completed") {
          setIsSuccessInfo(true);
          setError("Generation completed. You can see results in the All Images section.");
          setIsGenerating(false);
          setIsLoading(false);
          return;
        } 
        
        if (data.status === "suspended") {
          // Redirect to approval page
          router.replace(`/dashboard/projects/${projectId}/approval`);
          return;
        } 
        
        if (data.status === "running") {
          // Still running - shouldn't happen if approval page waited properly
          // Show loading and do one retry
          setIsGenerating(true);
          setIsLoading(false);
          setGenerationMessage("Finishing up...");
          return;
        } 
        
        if (data.status === "none") {
          router.replace(`/dashboard/projects/${projectId}`);
          return;
        }

        // Unknown state
        setError("Unable to load results. Please try refreshing.");
        setIsGenerating(false);
        setIsLoading(false);

      } catch (err) {
        console.error("Error fetching results:", err);
        setError("Failed to load results. Please try again.");
        setIsGenerating(false);
        setIsLoading(false);
      }
    }

    fetchResults();
  }, [projectId, router]);

  const handleEdit = (imageId: string) => {
    router.push(`/dashboard/projects/${projectId}/edit-image/${imageId}`);
  };

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

  // Show generating UI if actively generating (priority over isLoading)
  if (isGenerating) {
    return (
      <div className="space-y-6">
        <div className="flex min-h-[500px] items-center justify-center">
          <div className="flex flex-col items-center gap-6 max-w-md text-center">
            <div className="relative">
              <div className="absolute inset-0 animate-ping rounded-full bg-primary/20" />
              <div className="relative flex size-20 items-center justify-center rounded-full bg-primary/10">
                <Loader2 className="size-10 animate-spin text-primary" />
              </div>
            </div>
            <div className="space-y-2">
              <h2 className="text-lg font-semibold">Creating Your Images</h2>
              <p className="text-sm text-muted-foreground">{generationMessage}</p>
            </div>
            <div className="w-full max-w-xs">
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div 
                  className="h-full animate-pulse rounded-full bg-gradient-to-r from-primary to-purple-600" 
                  style={{ 
                    width: "100%",
                    animation: "pulse 1.5s ease-in-out infinite, shimmer 2s ease-in-out infinite"
                  }} 
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              This usually takes 30-60 seconds
            </p>
          </div>
        </div>
      </div>
    );
  }

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
        <Card className={cn(
          "bg-destructive/5",
          isSuccessInfo ? "border-blue-500/50 bg-blue-500/5" : "border-destructive/50"
        )}>
          <CardHeader>
            <CardTitle className={cn(
              isSuccessInfo ? "text-blue-500" : "text-destructive"
            )}>
              {isSuccessInfo ? "Info" : "Error"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{error}</p>
            <div className="flex gap-2 mt-4">
              <Button variant="outline" asChild>
                <Link href={`/dashboard/projects/${projectId}/gallery`}>
                  <ArrowLeft className="mr-2 size-4" />
                  Go to Gallery
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
    

      {/* Success Notification - Right Side */}
      <div className="flex justify-end">
        <Card className="border-green-500/50 bg-green-500/5 shadow-sm max-w-xs">
          <CardContent className="flex items-center gap-2 py-3 px-4">
            <div className="flex size-6 items-center justify-center rounded-full bg-green-500/20">
              <Check className="size-3.5 text-green-500" />
            </div>
            <div>
              <p className="text-sm font-medium text-green-500">Generation Completed</p>
              <p className="text-xs text-muted-foreground">
                {images.length} image{images.length !== 1 ? "s" : ""} generated successfully
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Image Gallery */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {images.map((image, index) => {
          const isSelected = image.id === selectedImageId;
          
          return (
            <Card 
              key={index} 
              className={cn(
                "overflow-hidden transition-all duration-200 group",
                isSelected ? "ring-2 ring-primary border-primary" : "hover:border-primary/50"
              )}
            >
              <div className="relative bg-muted w-full">
                <img
                  src={image.url}
                  alt={`Generated image ${index + 1}`}
                  className="w-full h-auto"
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                  <Button 
                    variant="secondary"
                    onClick={(e) => {
                      e.stopPropagation();
                      setPreviewImage(image);
                    }}
                  >
                    <Eye className="mr-2 size-4" />
                    Preview
                  </Button>
                  {image.id && (
                    <Button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEdit(image.id!);
                      }}
                    >
                      <Paintbrush className="mr-2 size-4" />
                      Edit
                    </Button>
                  )}
                </div>
              </div>
              {/* <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">
                    {image.persona && (
                      <span className="capitalize">{image.persona.replace(/-/g, " ")}</span>
                    )}
                    {!image.persona && <span>Image {index + 1}</span>}
                  </div>
                  <div className="flex gap-2">
                    {image.id && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEdit(image.id!);
                        }}
                        title="Edit Image"
                      >
                        <Paintbrush className="size-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDownload(image.url, image.file_name || `image-${index + 1}.png`);
                      }}
                    >
                      <Download className="size-4" />
                    </Button>
                    <Button variant="ghost" size="icon" asChild onClick={(e) => e.stopPropagation()}>
                      <a href={image.url} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="size-4" />
                      </a>
                    </Button>
                  </div>
                </div>
              </CardContent> */}
            </Card>
          );
        })}
      </div>

      {/* Image Preview Modal */}
      {previewImage && (
        <div 
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setPreviewImage(null)}
        >
          <div className="relative max-w-[90vw] max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
            <Button
              variant="ghost"
              size="icon"
              className="absolute -top-12 right-0 text-white hover:bg-white/20"
              onClick={() => setPreviewImage(null)}
            >
              <X className="size-6" />
            </Button>
            
            <div className="relative w-full h-full">
              <img
                src={previewImage.url}
                alt="Preview"
                className="max-w-full max-h-[90vh] w-auto h-auto object-contain"
              />
            </div>

            {/* Action Buttons */}
            <div className="absolute bottom-4 right-4 flex gap-2">
              <Button
                onClick={() => handleDownload(previewImage.url, previewImage.file_name || "image.png")}
                variant="secondary"
              >
                <Download className="mr-2 size-4" />
                Download
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
