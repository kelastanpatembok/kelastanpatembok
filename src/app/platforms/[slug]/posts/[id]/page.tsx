import type { Metadata } from "next";
import { db } from "@/lib/firebase";
import { collection, doc, getDoc, getDocs, query, where, limit } from "firebase/firestore";
import { PostDetailClient } from "./post-detail-client";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

type Params = { params: Promise<{ slug: string; id: string }> };

// Helper to strip HTML tags for description
function stripHtml(html: string): string {
  if (!html) return "";
  return html.replace(/<[^>]*>/g, "").trim();
}

// Helper to serialize Firestore data for client components
function serializeForClient(data: any): any {
  if (!data) return data;
  if (typeof data !== "object") return data;
  if (data instanceof Date) return data.toISOString();
  if (data.toDate && typeof data.toDate === "function") return data.toDate().toISOString(); // Firestore Timestamp
  if (data.seconds && typeof data.seconds === "number") return new Date(data.seconds * 1000).toISOString();
  
  if (Array.isArray(data)) {
    return data.map(item => serializeForClient(item));
  }
  
  const serialized: any = {};
  for (const [key, value] of Object.entries(data)) {
    serialized[key] = serializeForClient(value);
  }
  return serialized;
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug, id } = await params;
  
  try {
    // Get platform by slug
    const ps = await getDocs(query(collection(db, "platforms"), where("slug", "==", slug), limit(1)));
    if (ps.empty) {
      return {
        title: "Post Not Found",
        description: "The post you're looking for doesn't exist."
      };
    }
    
    const platformData: any = { id: ps.docs[0].id, ...(ps.docs[0].data() as Record<string, any>) };
    const platformId = ps.docs[0].id;
    
    // Get post by id
    const postDoc = await getDoc(doc(db, "platforms", platformId, "posts", id));
    if (!postDoc.exists()) {
      return {
        title: "Post Not Found",
        description: "The post you're looking for doesn't exist."
      };
    }
    
    const postData: any = postDoc.data();
    const plainContent = stripHtml(postData.content || "");
    const description = plainContent.slice(0, 160) + (plainContent.length > 160 ? "..." : "");
    const imageUrl = postData.imageUrl || platformData.primaryColor ? `data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='1200' height='630'><rect fill='%23${platformData.primaryColor?.replace('#', '') || '66b132'}' width='1200' height='630'/><text x='50%25' y='50%25' font-family='Arial' font-size='48' fill='white' text-anchor='middle' dy='.3em'>${encodeURIComponent(postData.authorName || "Post")}</text></svg>` : undefined;
    
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
    const url = `${baseUrl}/platforms/${slug}/posts/${id}`;
    
    return {
      title: `${postData.authorName || "Post"} • ${platformData.name || "RWID Community"}`,
      description,
      openGraph: {
        title: `${postData.authorName || "Post"} • ${platformData.name || "RWID Community"}`,
        description,
        url,
        siteName: platformData.name || "RWID Community",
        images: imageUrl ? [
          {
            url: imageUrl,
            width: 1200,
            height: 630,
            alt: postData.authorName || "Post"
          }
        ] : [],
        locale: "en_US",
        type: "article",
        authors: [postData.authorName],
      },
      twitter: {
        card: "summary_large_image",
        title: `${postData.authorName || "Post"} • ${platformData.name || "RWID Community"}`,
        description,
        images: imageUrl ? [imageUrl] : [],
      },
    };
  } catch (error) {
    console.error("Error generating metadata:", error);
    return {
      title: "Post • RWID Community",
      description: "View this post on RWID Community"
    };
  }
}

export default async function PostDetailPage({ params }: Params) {
  const { slug, id } = await params;
  
  let platform: any = null;
  let post: any = null;
  
  try {
    // Get platform by slug
    const ps = await getDocs(query(collection(db, "platforms"), where("slug", "==", slug), limit(1)));
    if (ps.empty) {
      return (
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <h2 className="text-xl font-semibold mb-2">Platform not found</h2>
            <Button asChild>
              <Link href="/">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to home
              </Link>
            </Button>
          </div>
        </div>
      );
    }
    
    const platformData = { id: ps.docs[0].id, ...ps.docs[0].data() };
    platform = serializeForClient(platformData);
    const platformId = ps.docs[0].id;
    
    // Get post by id - this will fail if user doesn't have access to private platform
    const postDoc = await getDoc(doc(db, "platforms", platformId, "posts", id));
    if (!postDoc.exists()) {
      return <PostDetailClient platform={platform} post={null} slug={slug} id={id} error="not-found" />;
    }
    
    post = serializeForClient({ id: postDoc.id, ...postDoc.data() });
  } catch (error: any) {
    console.error("Error loading post:", error);
    // If permission denied, show access denied UI
    if (error.code === 'permission-denied' && platform) {
      return <PostDetailClient platform={platform} post={null} slug={slug} id={id} error="access-denied" />;
    }
    // For other errors or missing platform, show generic error
    return <PostDetailClient platform={platform || null} post={null} slug={slug} id={id} error="error" />;
  }
  
  return <PostDetailClient platform={platform} post={post} slug={slug} id={id} />;
}
