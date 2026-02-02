import { createClient } from "@/lib/supabase/server";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronLeft, Download, Pencil } from "lucide-react";

export default async function ComparisonPage({
  params,
}: {
  params: Promise<{ projectId: string; imageId: string; afterImageId: string }>;
}) {
  const { projectId, imageId, afterImageId } = await params;
  const supabase = await createClient();

  // Fetch both images
  const { data: images, error } = await supabase
    .from("project_content")
    .select("*")
    .in("id", [imageId, afterImageId]);

  if (error || !images || images.length < 2) {
    console.error("Comparison images not found:", error, images);
    // Fallback: search for them individually maybe?
  }

  const beforeImage = images?.find((img) => img.id === imageId);
  const afterImage = images?.find((img) => img.id === afterImageId);

  if (!afterImage) {
    return notFound();
  }

  // If beforeImage is not found (maybe it was deleted?), 
  // try to use the source_image URL from the after image's content_data
  const beforeUrl = beforeImage?.content_data?.url || afterImage.content_data?.source_image;

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
          <h1 className="text-3xl font-bold tracking-tight">Edit Comparison</h1>
          <p className="text-muted-foreground">
            Review your transformation — click on either image to edit it further
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
         {/* BEFORE */}
         <div className="space-y-4">
            <div className="flex items-center justify-between px-1">
               <span className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Original (Before)</span>
               {beforeImage && (
                 <div className="flex gap-2">
                   <Button size="sm" variant="ghost" className="h-8" asChild>
                     <a href={beforeUrl} download target="_blank" rel="noreferrer">
                       <Download className="h-4 w-4 mr-2" />
                       Download
                     </a>
                   </Button>
                   <Button size="sm" variant="outline" className="h-8" asChild>
                     <Link href={`/dashboard/projects/${projectId}/edit-image/${imageId}`}>
                       <Pencil className="h-4 w-4 mr-2" />
                       Edit This
                     </Link>
                   </Button>
                 </div>
               )}
            </div>
            <Card variant="glass" className="overflow-hidden border-border/50 group cursor-pointer hover:ring-2 hover:ring-muted-foreground/30 transition-all">
               <Link href={`/dashboard/projects/${projectId}/edit-image/${imageId}`} className="block">
                 <div className="aspect-square relative bg-black/5">
                    <Image
                      src={beforeUrl}
                      alt="Original Image"
                      fill
                      className="object-contain"
                      unoptimized
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-background/90 rounded-full p-3 shadow-lg">
                        <Pencil className="h-6 w-6 text-foreground" />
                      </div>
                    </div>
                 </div>
               </Link>
            </Card>
         </div>

         {/* AFTER */}
         <div className="space-y-4">
            <div className="flex items-center justify-between px-1">
               <span className="text-sm font-bold uppercase tracking-wider text-primary">Transformed (After)</span>
               <div className="flex gap-2">
                 <Button size="sm" variant="ghost" className="h-8" asChild>
                   <a href={afterImage.content_data.url} download target="_blank" rel="noreferrer">
                     <Download className="h-4 w-4 mr-2" />
                     Download
                   </a>
                 </Button>
                 <Button size="sm" variant="default" className="h-8" asChild>
                   <Link href={`/dashboard/projects/${projectId}/edit-image/${afterImageId}`}>
                     <Pencil className="h-4 w-4 mr-2" />
                     Edit This
                   </Link>
                 </Button>
               </div>
            </div>
            <Card variant="glass" className="overflow-hidden ring-2 ring-primary bg-primary/5 group cursor-pointer hover:ring-primary/70 transition-all">
               <Link href={`/dashboard/projects/${projectId}/edit-image/${afterImageId}`} className="block">
                 <div className="aspect-square relative bg-black/5">
                    <Image
                      src={afterImage.content_data.url}
                      alt="Edited Image"
                      fill
                      className="object-contain"
                      unoptimized
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-primary rounded-full p-3 shadow-lg">
                        <Pencil className="h-6 w-6 text-primary-foreground" />
                      </div>
                    </div>
                 </div>
               </Link>
               <div className="p-4 bg-background/50 border-t border-primary/10">
                 <div className="text-sm font-medium mb-1">Prompt Applied:</div>
                 <p className="text-sm text-muted-foreground italic">
                   "{afterImage.content_data.prompt}"
                 </p>
               </div>
            </Card>
         </div>
      </div>
    </div>
  );
}
