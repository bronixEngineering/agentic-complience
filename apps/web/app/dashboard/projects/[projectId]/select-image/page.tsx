import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";

export default async function SelectImagePage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const supabase = await createClient();

  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("name")
    .eq("id", projectId)
    .single();

  if (projectError || !project) {
    notFound();
  }

  // Fetch generated images
  const { data: images, error: imagesError } = await supabase
    .from("project_content")
    .select("*")
    .eq("project_id", projectId)
    .eq("content_type", "generated_image")
    .order("created_at", { ascending: false });

  if (imagesError) {
    console.error("Error fetching images:", imagesError);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-muted-foreground text-sm">Project: {project.name}</div>
          <h1 className="text-lg font-semibold tracking-tight">Select Image to Edit</h1>
        </div>
        <Button variant="secondary" asChild>
          <Link href={`/dashboard/projects/${projectId}`}>Back to Project</Link>
        </Button>
      </div>

      {!images || images.length === 0 ? (
        <Card variant="glass">
          <CardContent className="py-10 text-center text-muted-foreground">
            No generated images found for this project yet. Please generate some images first.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {images.map((img) => {
            const contentData = typeof img.content_data === 'string' 
                ? JSON.parse(img.content_data) 
                : img.content_data;
            const url = contentData?.url;

            if (!url) return null;

            return (
              <Card key={img.id} className="overflow-hidden hover:ring-2 hover:ring-primary transition-all">
                <div className="aspect-square relative group">
                  <Image
                    src={url}
                    alt={contentData.prompt || "Generated Image"}
                    fill
                    className="object-cover"
                  />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Button asChild>
                        <Link href={`/dashboard/projects/${projectId}/edit-image/${img.id}`}>
                            Edit Image
                        </Link>
                    </Button>
                  </div>
                </div>
                <div className="p-3 text-xs text-muted-foreground truncate">
                  {contentData.prompt || "No prompt"}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
