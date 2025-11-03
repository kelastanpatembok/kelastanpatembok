import { notFound } from "next/navigation";
import { db } from "@/lib/firebase";
import { doc, getDoc, collection, query, where, limit, getDocs } from "firebase/firestore";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Briefcase, MapPin, Globe, Mail } from "lucide-react";

type Params = { params: Promise<{ userId: string }> };

export async function generateMetadata({ params }: Params) {
  const { userId } = await params;
  try {
    // Try to find user by username first
    let userDoc;
    const usersByUsername = await getDocs(query(collection(db, "users"), where("username", "==", userId), limit(1)));
    if (usersByUsername.docs.length > 0) {
      userDoc = usersByUsername.docs[0];
    } else {
      // Fallback to userId (backward compatibility)
      userDoc = await getDoc(doc(db, "users", userId));
    }
    
    if (userDoc.exists()) {
      const user = userDoc.data();
      return {
        title: `${user.displayName || user.name || "Profile"} | Profile`,
        description: user.bio || `View ${user.displayName || user.name || "this user"}'s profile`,
      };
    }
  } catch (error) {
    console.error("Error generating metadata:", error);
  }
  return {
    title: "Profile Not Found",
  };
}

export default async function PublicProfilePage({ params }: Params) {
  const { userId } = await params;
  
  try {
    // Try to find user by username first
    let userDoc;
    let foundByUsername = false;
    
    const usersByUsername = await getDocs(query(collection(db, "users"), where("username", "==", userId), limit(1)));
    if (usersByUsername.docs.length > 0) {
      userDoc = usersByUsername.docs[0];
      foundByUsername = true;
    } else {
      // Fallback to userId (backward compatibility)
      userDoc = await getDoc(doc(db, "users", userId));
    }
    
    if (!userDoc.exists()) {
      notFound();
    }
    
    const user = userDoc.data();
    
    // Convert Timestamp to ISO string for serialization
    const serializedUser = {
      id: userDoc.id,
      displayName: user.displayName || "",
      name: user.name || "",
      headline: user.headline || "",
      currentPosition: user.currentPosition || "",
      bio: user.bio || "",
      location: user.location || "",
      website: user.website || "",
      email: user.email || "",
      photoURL: user.photoURL || "",
      bannerURL: user.bannerURL || "",
      skills: user.skills || [],
      createdAt: user.createdAt?.toDate?.()?.toISOString() || null,
    };
    
    return (
      <div className="space-y-6">
        {/* Banner Section */}
        <div className="relative w-full h-64 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg overflow-hidden">
          {serializedUser.bannerURL && (
            <img 
              src={serializedUser.bannerURL} 
              alt="Banner" 
              className="w-full h-full object-cover"
            />
          )}
        </div>

        {/* Profile Card */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row items-start gap-6">
              {/* Avatar */}
              <div className="relative -mt-24 md:-mt-32">
                <Avatar className="h-32 w-32 md:h-40 md:w-40 border-4 border-background">
                  <AvatarImage src={serializedUser.photoURL || ""} alt={serializedUser.displayName || serializedUser.name} />
                  <AvatarFallback className="text-2xl md:text-4xl">
                    {(serializedUser.displayName || serializedUser.name || "U").substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </div>

              {/* Profile Info */}
              <div className="flex-1 w-full md:mt-0 mt-4">
                <div className="mb-4">
                  <h1 className="text-3xl font-bold">{serializedUser.displayName || serializedUser.name}</h1>
                  {serializedUser.headline && <p className="text-lg text-muted-foreground mt-1">{serializedUser.headline}</p>}
                </div>

                {/* Contact Info */}
                <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                  {serializedUser.currentPosition && (
                    <div className="flex items-center gap-1">
                      <Briefcase className="h-4 w-4" />
                      <span>{serializedUser.currentPosition}</span>
                    </div>
                  )}
                  {serializedUser.location && (
                    <div className="flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      <span>{serializedUser.location}</span>
                    </div>
                  )}
                  {serializedUser.email && (
                    <div className="flex items-center gap-1">
                      <Mail className="h-4 w-4" />
                      <span>{serializedUser.email}</span>
                    </div>
                  )}
                  {serializedUser.website && (
                    <div className="flex items-center gap-1">
                      <Globe className="h-4 w-4" />
                      <a href={serializedUser.website} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                        {serializedUser.website}
                      </a>
                    </div>
                  )}
                </div>

                {/* Skills */}
                {serializedUser.skills.length > 0 && (
                  <div className="mt-4">
                    <div className="flex flex-wrap gap-2">
                      {serializedUser.skills.map((skill: string) => (
                        <Badge
                          key={skill}
                          variant="secondary"
                          className="bg-primary/10 text-primary border border-primary/20"
                        >
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Bio */}
                {serializedUser.bio && (
                  <div className="mt-6">
                    <p className="text-base whitespace-pre-wrap">{serializedUser.bio}</p>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  } catch (error) {
    console.error("Error loading profile:", error);
    notFound();
  }
}

