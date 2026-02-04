"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { Edit3, Loader2, Clock, CheckCircle, XCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

interface EditItem {
  id: string;
  original_url: string;
  edited_url?: string;
  edit_prompt: string;
  status: "pending" | "processing" | "completed" | "failed";
  created_at: string;
  completed_at?: string;
  aspect_ratio?: string;
}

export default function EditQueuePage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.projectId as string;

  const [editItems, setEditItems] = useState<EditItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchEditQueue() {
      try {
        const supabase = createClient();
        
        // Fetch all edited images from project_content
        const { data, error } = await supabase
          .from("project_content")
          .select("id, content_data, created_at")
          .eq("project_id", projectId)
          .eq("content_type", "edited_image")
          .order("created_at", { ascending: false });

        if (error) throw error;

        if (data) {
          const parsedItems = data.map(item => {
            const contentData = typeof item.content_data === 'string' 
              ? JSON.parse(item.content_data) 
              : item.content_data;
            
            return {
              id: item.id,
              original_url: contentData.original_url || contentData.source_image || "",
              edited_url: contentData.url,
              edit_prompt: contentData.edit_prompt || "Image edit",
              status: contentData.status || "completed",
              created_at: item.created_at,
              completed_at: item.created_at,
              aspect_ratio: contentData.aspect_ratio,
            };
          });
          
          setEditItems(parsedItems);
        }
      } catch (err) {
        console.error("Error fetching edit queue:", err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchEditQueue();
  }, [projectId]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge variant="default" className="bg-green-500"><CheckCircle className="mr-1 size-3" />Completed</Badge>;
      case "processing":
        return <Badge variant="secondary"><Loader2 className="mr-1 size-3 animate-spin" />Processing</Badge>;
      case "failed":
        return <Badge variant="danger"><XCircle className="mr-1 size-3" />Failed</Badge>;
      default:
        return <Badge variant="outline"><Clock className="mr-1 size-3" />Pending</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Loading edit queue...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Edit3 className="size-5 text-primary" />
          <h1 className="text-lg font-semibold tracking-tight">Edit Queue</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Track your image edits ({editItems.length} total)
        </p>
      </div>

      {/* Edit Items */}
      {editItems.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Edit3 className="size-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No edits yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              Edit an image to see it here
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {editItems.map((item) => (
            <Card key={item.id} className="overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">
                    {item.edit_prompt}
                  </CardTitle>
                  {getStatusBadge(item.status)}
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2">
                  {/* Original Image */}
                  <div>
                    <p className="text-xs text-muted-foreground mb-2">Original</p>
                    <div className="relative aspect-square bg-muted rounded-lg overflow-hidden">
                      <Image
                        src={item.original_url}
                        alt="Original"
                        fill
                        className="object-cover"
                        unoptimized
                      />
                    </div>
                  </div>

                  {/* Edited Image */}
                  <div>
                    <p className="text-xs text-muted-foreground mb-2">Edited</p>
                    {item.edited_url ? (
                      <div className="relative aspect-square bg-muted rounded-lg overflow-hidden">
                        <Image
                          src={item.edited_url}
                          alt="Edited"
                          fill
                          className="object-cover"
                          unoptimized
                        />
                      </div>
                    ) : (
                      <div className="flex aspect-square items-center justify-center bg-muted rounded-lg">
                        <Loader2 className="size-8 animate-spin text-muted-foreground" />
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between mt-4 text-xs text-muted-foreground">
                  <span>Created {new Date(item.created_at).toLocaleString()}</span>
                  {item.completed_at && (
                    <span>Completed {new Date(item.completed_at).toLocaleString()}</span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
