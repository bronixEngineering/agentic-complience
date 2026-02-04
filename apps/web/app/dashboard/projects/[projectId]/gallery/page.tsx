"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Images, Download, Eye, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

interface ImageData {
  id: string;
  url: string;
  file_name?: string;
  persona?: string;
  aspect_ratio?: string;
  created_at: string;
}

export default function GalleryPage() {
  const params = useParams();
  const projectId = params.projectId as string;

  const [images, setImages] = useState<ImageData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [previewImage, setPreviewImage] = useState<ImageData | null>(null);

  useEffect(() => {
    async function fetchImages() {
      try {
        const supabase = createClient();
        
        const { data, error } = await supabase
          .from("project_content")
          .select("id, content_data, created_at")
          .eq("project_id", projectId)
          .eq("content_type", "generated_image")
          .order("created_at", { ascending: false });

        if (error) throw error;

        if (data) {
          const parsedImages = data.map(item => {
            const contentData = typeof item.content_data === 'string' 
              ? JSON.parse(item.content_data) 
              : item.content_data;
            
            return {
              id: item.id,
              url: contentData.url,
              file_name: contentData.file_name,
              persona: contentData.persona,
              aspect_ratio: contentData.aspect_ratio || "1:1",
              created_at: item.created_at,
            };
          });
          
          setImages(parsedImages);
        }
      } catch (err) {
        console.error("Error fetching images:", err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchImages();
  }, [projectId]);

  const handleDownload = async (imageUrl: string, fileName: string) => {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName || "image.png";
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
          <p className="text-sm text-muted-foreground">Loading gallery...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Images className="size-5 text-primary" />
          <h1 className="text-lg font-semibold tracking-tight">Image Gallery</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          All generated images for this project ({images.length} total)
        </p>
      </div>

      {/* Gallery Grid */}
      {images.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Images className="size-12 text-muted-foreground mb-4" />
            <p className="text-sm text-muted-foreground">No images generated yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              Create a brief to start generating images
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {images.map((image) => {
            return (
              <Card 
                key={image.id} 
                className="overflow-hidden transition-all duration-200 group hover:border-primary/50"
              >
                <div className="relative bg-muted w-full">
                  <img
                    src={image.url}
                    alt={`Image ${image.id}`}
                    className="w-full h-auto"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <Button 
                      size="sm"
                      variant="secondary"
                      onClick={() => setPreviewImage(image)}
                    >
                      <Eye className="mr-2 size-3" />
                      Preview
                    </Button>
                    <Button 
                      size="sm"
                      onClick={() => handleDownload(image.url, image.file_name || "image.png")}
                    >
                      <Download className="mr-2 size-3" />
                      Download
                    </Button>
                  </div>
                </div>
                <CardContent className="p-3">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="truncate">
                      {image.persona ? image.persona.replace(/-/g, " ") : "Image"}
                    </span>
                    <span>{new Date(image.created_at).toLocaleDateString()}</span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Preview Modal */}
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
              <span className="sr-only">Close</span>
              ✕
            </Button>
            
            <img
              src={previewImage.url}
              alt="Preview"
              className="max-w-full max-h-[90vh] w-auto h-auto object-contain"
            />

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
