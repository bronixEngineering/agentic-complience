"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronLeft, Download, Pencil, Eye, X } from "lucide-react";

export default function ComparisonPage() {
  const params = useParams();
  const projectId = params.projectId as string;
  const imageId = params.imageId as string;
  const afterImageId = params.afterImageId as string;
  
  const [beforeImage, setBeforeImage] = useState<any>(null);
  const [afterImage, setAfterImage] = useState<any>(null);
  const [beforeUrl, setBeforeUrl] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [previewImage, setPreviewImage] = useState<{ url: string; title: string } | null>(null);

  useEffect(() => {
    async function fetchImages() {
      const supabase = createClient();
      
      // Fetch both images
      const { data: images, error } = await supabase
        .from("project_content")
        .select("*")
        .in("id", [imageId, afterImageId]);

      if (error || !images || images.length < 2) {
        console.error("Comparison images not found:", error, images);
      }

      const before = images?.find((img) => img.id === imageId);
      const after = images?.find((img) => img.id === afterImageId);

      setBeforeImage(before);
      setAfterImage(after);
      
      // If beforeImage is not found (maybe it was deleted?), 
      // try to use the source_image URL from the after image's content_data
      const url = before?.content_data?.url || after?.content_data?.source_image;
      setBeforeUrl(url);
      setIsLoading(false);
    }

    fetchImages();
  }, [imageId, afterImageId]);

  const handleDownload = async (imageUrl: string, fileName: string) => {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download failed:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="container max-w-6xl py-8">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  if (!afterImage) {
    return (
      <div className="container max-w-6xl py-8">
        <div className="text-center">Image not found</div>
      </div>
    );
  }

  return (
    <div className="container max-w-6xl py-8 space-y-8">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <Link
            href={`/dashboard/projects/${projectId}/results`}
            className="flex items-center text-sm text-muted-foreground hover:text-primary transition-colors mb-2"
          >
            <ChevronLeft className="mr-1 h-4 w-4" />
            Back to Results
          </Link>
          <h1 className="text-lg font-semibold tracking-tight">Edit Comparison</h1>
          <p className="text-sm text-muted-foreground">
            Review your transformation — click on either image to edit it further
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
         {/* BEFORE */}
         <div className="space-y-4">
            <div className="flex items-center justify-between px-1">
               <span className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Original (Before)</span>
            </div>
            <Card variant="glass" className="overflow-hidden border-border/50 group transition-all">
               <div className="relative bg-muted w-full">
                  <img
                    src={beforeUrl}
                    alt="Original Image"
                    className="w-full h-auto"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                    <Button 
                      size="sm"
                      variant="secondary"
                      onClick={() => setPreviewImage({ url: beforeUrl, title: "Original (Before)" })}
                    >
                      <Eye className="mr-2 size-4" />
                      Preview
                    </Button>
                    {beforeImage && (
                      <Button 
                        size="sm"
                        asChild
                      >
                        <Link href={`/dashboard/projects/${projectId}/edit-image/${imageId}`}>
                          <Pencil className="mr-2 size-4" />
                          Edit
                        </Link>
                      </Button>
                    )}
                  </div>
               </div>
               {beforeImage && (
                 <div className="p-4 bg-background/50 border-t">
                   <Button 
                     size="sm" 
                     variant="outline" 
                     className="w-full"
                     onClick={() => handleDownload(beforeUrl, `original-${imageId}.png`)}
                   >
                     <Download className="h-4 w-4 mr-2" />
                     Download Image
                   </Button>
                 </div>
               )}
            </Card>
         </div>

         {/* AFTER */}
         <div className="space-y-4">
            <div className="flex items-center justify-between px-1">
               <span className="text-sm font-bold uppercase tracking-wider text-primary">Transformed (After)</span>
            </div>
            <Card variant="glass" className="overflow-hidden ring-2 ring-primary bg-primary/5 group transition-all">
               <div className="relative bg-muted w-full">
                  <img
                    src={afterImage.content_data.url}
                    alt="Edited Image"
                    className="w-full h-auto"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                    <Button 
                      size="sm"
                      variant="secondary"
                      onClick={() => setPreviewImage({ url: afterImage.content_data.url, title: "Transformed (After)" })}
                    >
                      <Eye className="mr-2 size-4" />
                      Preview
                    </Button>
                    <Button 
                      size="sm"
                      asChild
                    >
                      <Link href={`/dashboard/projects/${projectId}/edit-image/${afterImageId}`}>
                        <Pencil className="mr-2 size-4" />
                        Edit
                      </Link>
                    </Button>
                  </div>
               </div>
               <div className="p-4 bg-background/50 border-t border-primary/10 space-y-3">
                 <div>
                   <div className="text-sm font-medium mb-1">Prompt Applied:</div>
                   <p className="text-sm text-muted-foreground italic">
                     "{afterImage.content_data.prompt}"
                   </p>
                 </div>
                 <Button 
                   size="sm" 
                   variant="outline" 
                   className="w-full"
                   onClick={() => handleDownload(afterImage.content_data.url, `edited-${afterImageId}.png`)}
                 >
                   <Download className="h-4 w-4 mr-2" />
                   Download Image
                 </Button>
               </div>
            </Card>
         </div>
      </div>

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
              <X className="h-6 w-6" />
            </Button>
            
            <div className="mb-3 text-center">
              <p className="text-white text-sm font-medium">{previewImage.title}</p>
            </div>
            
            <img
              src={previewImage.url}
              alt="Preview"
              className="max-w-full max-h-[80vh] object-contain mx-auto"
            />
            
            <div className="flex gap-2 justify-center mt-4">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => handleDownload(previewImage.url, `image-${Date.now()}.png`)}
              >
                <Download className="mr-2 h-4 w-4" />
                Download
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
