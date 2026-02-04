import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { EditImageForm } from "./EditImageForm";

export default async function EditImagePage({
  params,
}: {
  params: Promise<{ projectId: string; imageId: string }>;
}) {
  const { projectId, imageId } = await params; // Await params in Next.js 15+
  const supabase = await createClient();

  const { data: project } = await supabase
    .from("projects")
    .select("name")
    .eq("id", projectId)
    .single();

  if (!project) notFound();

  const { data: image, error } = await supabase
    .from("project_content")
    .select("*")
    .eq("id", imageId)
    .single();

  if (error || !image) {
    notFound();
  }

  const contentData = typeof image.content_data === 'string' 
      ? JSON.parse(image.content_data) 
      : image.content_data;
  
  const imageUrl = contentData?.url;

  if (!imageUrl) {
      return <div>Error: Image URL not found for this content.</div>;
  }

  return (
    <div className="space-y-6">
      <EditImageForm 
        projectId={projectId} 
        sourceImageUrl={imageUrl} 
        imageId={imageId}
        projectName={project.name}
      />
    </div>
  );
}
