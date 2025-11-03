"use client";

import { useState, useRef, useEffect } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CommandDialog, Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { useAuth } from "@/components/auth-provider";
import { storage, auth, db } from "@/lib/firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { updateProfile } from "firebase/auth";
import { doc, setDoc, getDoc, getDocs, collection, addDoc, serverTimestamp, query, where, limit } from "firebase/firestore";
import { Camera, Edit, Save, X, MapPin, Globe, Mail, Briefcase, Plus, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import provinces from "@/data/indonesian-provinces.json";
import Link from "next/link";

export default function ProfilePage() {
  const { user } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const bannerInputRef = useRef<HTMLInputElement | null>(null);
  const [profileData, setProfileData] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [skills, setSkills] = useState<string[]>([]);
  const [availableSkills, setAvailableSkills] = useState<string[]>([]);
  const [newSkillInput, setNewSkillInput] = useState("");
  const [skillInputOpen, setSkillInputOpen] = useState(false);
  
  // Form state
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [usernameTaken, setUsernameTaken] = useState<boolean | null>(null);
  const [headline, setHeadline] = useState("");
  const [currentPosition, setCurrentPosition] = useState("");
  const [bio, setBio] = useState("");
  const [location, setLocation] = useState("");
  const [website, setWebsite] = useState("");
  const [email, setEmail] = useState("");
  const [platforms, setPlatforms] = useState<any[]>([]);
  const [loadingPlatforms, setLoadingPlatforms] = useState(false);

  // Helper function to generate username from name (no space)
  const generateUsername = (name: string): string => {
    if (!name) return "";
    return name.toLowerCase().trim().replace(/\s+/g, "").replace(/[^a-z0-9]/g, "");
  };

  // Check username uniqueness
  const checkUsername = async (checkUsername: string) => {
    if (!checkUsername || checkUsername.length < 3) {
      setUsernameTaken(null);
      return;
    }
    
    try {
      const uid = auth.currentUser?.uid;
      if (!uid) return;
      
      // Check if username is taken by another user
      const usersSnap = await getDocs(query(collection(db, "users"), where("username", "==", checkUsername), limit(1)) as any);
      
      // If username exists and belongs to another user
      if (usersSnap.docs.length > 0) {
        const existingUser = usersSnap.docs[0];
        if (existingUser.id !== uid) {
          setUsernameTaken(true);
        } else {
          // Same user, username is available for them
          setUsernameTaken(false);
        }
      } else {
        // Username doesn't exist yet
        setUsernameTaken(false);
      }
    } catch (e) {
      console.error("Error checking username:", e);
      setUsernameTaken(null);
    }
  };

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    
    (async () => {
      try {
        const uid = auth.currentUser?.uid;
        if (!uid) {
          setLoading(false);
          return;
        }
        const userDoc = await getDoc(doc(db, "users", uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          setProfileData(data);
          setDisplayName(data.displayName || user.name || "");
          setUsername(data.username || generateUsername(data.displayName || user.name || ""));
          setHeadline(data.headline || "");
          setCurrentPosition(data.currentPosition || "");
          setBio(data.bio || "");
          setLocation(data.location || "");
          setWebsite(data.website || "");
          setEmail(data.email || "");
          setSkills(data.skills || []);
        } else {
          // Initialize with empty data
          const name = user.name || "";
          setDisplayName(name);
          setUsername(generateUsername(name));
          setEmail((user as any).email || "");
        }
        
        // Load available skills from /skills collection
        try {
          const skillsSnap = await getDocs(collection(db, "skills"));
          const skillNames = skillsSnap.docs.map(doc => doc.data().name || doc.id).filter(Boolean);
          setAvailableSkills(skillNames);
        } catch (error) {
          console.error("Error loading skills:", error);
        }

        // Load platforms where user is member or owner (check via communities membership)
        setLoadingPlatforms(true);
        try {
          const uid = auth.currentUser?.uid;
          if (uid) {
            // Get all platforms
            const platformsSnap = await getDocs(query(collection(db, "platforms")));
            const allPlatforms = platformsSnap.docs.map(d => ({ id: d.id, ...d.data() })) as any[];
            
            // Check membership for each platform
            const userPlatforms: any[] = [];
            await Promise.all(allPlatforms.map(async (platform: any) => {
              // Check if user is owner
              if (platform.ownerId === uid) {
                // Load communities for owner
                try {
                  const commSnap = await getDocs(query(collection(db, "platforms", platform.id, "communities")) as any);
                  const communities = commSnap.docs.map((d: any) => ({ id: d.id, ...d.data() }));
                  userPlatforms.push({ ...platform, role: "owner", communities });
                } catch (e) {
                  userPlatforms.push({ ...platform, role: "owner", communities: [] });
                }
                return;
              }
              
              // Check if user is member (has access to any community)
              try {
                const memberDoc = await getDoc(doc(db, "platforms", platform.id, "members", uid));
                if (memberDoc.exists()) {
                  const memberData = memberDoc.data() as any;
                  const communityIds = memberData.communities || [];
                  
                  if (communityIds.length > 0) {
                    // Load community details
                    const communities: any[] = [];
                    await Promise.all(communityIds.map(async (commId: string) => {
                      try {
                        const commDoc = await getDoc(doc(db, "platforms", platform.id, "communities", commId));
                        if (commDoc.exists()) {
                          communities.push({ id: commDoc.id, ...commDoc.data() });
                        }
                      } catch (e) {
                        // Skip if error loading community
                      }
                    }));
                    
                    userPlatforms.push({ 
                      ...platform, 
                      role: (memberData as any)?.role || "member",
                      joinedAt: (memberData as any)?.joinedAt,
                      communities
                    });
                  }
                }
              } catch (e) {
                // Skip if error checking membership
              }
            }));
            
            setPlatforms(userPlatforms);
          }
        } catch (error) {
          console.error("Error loading platforms:", error);
        } finally {
          setLoadingPlatforms(false);
        }
      } catch (error) {
        console.error("Error loading profile:", error);
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  if (!user) return <div className="text-sm text-muted-foreground">Please log in to view your profile.</div>;

  const handleSave = async () => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;

    // Generate username from displayName if empty
    let finalUsername = username.trim();
    if (!finalUsername && displayName.trim()) {
      finalUsername = generateUsername(displayName);
    }

    // Check username uniqueness if it changed
    if (finalUsername) {
      const usersSnap = await getDocs(query(collection(db, "users"), where("username", "==", finalUsername), limit(1)) as any);
      const existingUser = usersSnap.docs.find((doc: any) => doc.id !== uid);
      
      if (existingUser) {
        toast.error("Username already taken. Please choose a different username.");
        setUsernameTaken(true);
        return;
      }
    }
    
    setSaving(true);
    try {
      await setDoc(doc(db, "users", uid), {
        displayName,
        username: finalUsername,
        headline,
        currentPosition,
        bio,
        location,
        website,
        email,
        skills,
        updatedAt: serverTimestamp(),
      }, { merge: true });
      
      if (auth.currentUser && displayName) {
        await updateProfile(auth.currentUser, { displayName });
      }
      
      toast.success("Profile updated successfully");
      setIsEditing(false);
      setProfileData((prev: any) => ({ ...prev, displayName, username: finalUsername, headline, currentPosition, bio, location, website, email, skills }));
    } catch (error) {
      console.error("Error saving profile:", error);
      toast.error("Failed to save profile");
    } finally {
      setSaving(false);
    }
  };

  const handleAddSkill = async (skillName: string) => {
    if (!skillName.trim()) return;
    const trimmedSkill = skillName.trim();
    
    // Check if skill already exists in user's skills
    if (skills.includes(trimmedSkill)) {
      toast.error("Skill already added");
      return;
    }
    
    // Add skill to user's list
    setSkills([...skills, trimmedSkill]);
    setNewSkillInput("");
    setSkillInputOpen(false);
    
    // Check if skill exists in /skills collection, if not add it
    try {
      const skillsSnap = await getDocs(collection(db, "skills"));
      const existingSkills = skillsSnap.docs.map(doc => doc.data().name || doc.id);
      
      if (!existingSkills.includes(trimmedSkill)) {
        await addDoc(collection(db, "skills"), {
          name: trimmedSkill,
          createdAt: serverTimestamp(),
        });
        setAvailableSkills([...availableSkills, trimmedSkill]);
        toast.success("New skill added to database");
      }
    } catch (error) {
      console.error("Error adding skill to collection:", error);
    }
  };

  const handleRemoveSkill = (skillName: string) => {
    setSkills(skills.filter(s => s !== skillName));
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
            const file = e.target.files?.[0];
            if (!file) return;
            try {
              setUploading(true);
              const uid = auth.currentUser?.uid || (user as any)?.id;
              const objectRef = ref(storage, `avatars/${uid}`);
              await uploadBytes(objectRef, file, { contentType: file.type || "image/png" });
              const url = await getDownloadURL(objectRef);
              if (auth.currentUser) {
                await updateProfile(auth.currentUser, { photoURL: url });
        await setDoc(doc(db, "users", auth.currentUser.uid), { 
          photoURL: url,
          updatedAt: serverTimestamp()
        }, { merge: true });
        // Update local state
        setProfileData((prev: any) => ({ ...prev, photoURL: url }));
      }
      toast.success("Avatar updated successfully");
    } catch (error) {
      console.error("Error uploading avatar:", error);
      toast.error("Failed to upload avatar");
            } finally {
              setUploading(false);
              if (fileInputRef.current) fileInputRef.current.value = "";
            }
  };

  const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploadingBanner(true);
      const uid = auth.currentUser?.uid || (user as any)?.id;
      const objectRef = ref(storage, `banners/${uid}`);
      await uploadBytes(objectRef, file, { contentType: file.type || "image/png" });
      const url = await getDownloadURL(objectRef);
      if (auth.currentUser) {
        await setDoc(doc(db, "users", auth.currentUser.uid), { 
          bannerURL: url,
          updatedAt: serverTimestamp()
        }, { merge: true });
        // Update local state
        setProfileData((prev: any) => ({ ...prev, bannerURL: url }));
      }
      toast.success("Banner updated successfully");
    } catch (error) {
      console.error("Error uploading banner:", error);
      toast.error("Failed to upload banner");
    } finally {
      setUploadingBanner(false);
      if (bannerInputRef.current) bannerInputRef.current.value = "";
    }
  };

  if (loading) {
    return <div className="text-sm text-muted-foreground">Loading profile...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Banner Section */}
      <div className="relative w-full h-64 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg overflow-hidden group">
        <input ref={bannerInputRef} type="file" accept="image/*" className="hidden" onChange={handleBannerUpload} />
        {profileData?.bannerURL && (
          <img 
            src={profileData.bannerURL} 
            alt="Banner" 
            className="w-full h-full object-cover"
          />
        )}
        <Button
          variant="secondary"
          size="sm"
          className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={() => bannerInputRef.current?.click()}
          disabled={uploadingBanner}
        >
          <Camera className="h-4 w-4 mr-2" />
          {uploadingBanner ? "Uploading..." : "Change Banner"}
        </Button>
      </div>

      {/* Profile Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row items-start gap-6">
            {/* Avatar */}
            <div className="relative -mt-24 md:-mt-32">
              <Avatar className="h-32 w-32 md:h-40 md:w-40 border-4 border-background">
                <AvatarImage src={profileData?.photoURL || user.avatarUrl || ""} alt={user.name} />
                <AvatarFallback className="text-2xl md:text-4xl">{user.name.substring(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
              <Button
                variant="secondary"
                size="sm"
                className="absolute bottom-0 right-0 rounded-full w-10 h-10 p-0"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                <Camera className="h-4 w-4" />
              </Button>
            </div>

            {/* Profile Info */}
            <div className="flex-1 w-full md:mt-0 mt-4">
              {!isEditing ? (
                <>
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h1 className="text-3xl font-bold">{displayName || user.name}</h1>
                      {headline && <p className="text-lg text-muted-foreground mt-1">{headline}</p>}
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/profile/${profileData?.username || username || user.id}`} target="_blank">
                          <ExternalLink className="h-4 w-4 mr-2" />
                          View Public Profile
                        </Link>
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                        <Edit className="h-4 w-4 mr-2" />
                        Edit Profile
                      </Button>
                    </div>
                  </div>

                  {/* Contact Info */}
                  <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                    {currentPosition && (
                      <div className="flex items-center gap-1">
                        <Briefcase className="h-4 w-4" />
                        <span>{currentPosition}</span>
                      </div>
                    )}
                    {location && (
                      <div className="flex items-center gap-1">
                        <MapPin className="h-4 w-4" />
                        <span>{location}</span>
                      </div>
                    )}
                    {email && (
                      <div className="flex items-center gap-1">
                        <Mail className="h-4 w-4" />
                        <span>{email}</span>
                      </div>
                    )}
                    {website && (
                      <div className="flex items-center gap-1">
                        <Globe className="h-4 w-4" />
                        <a href={website} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                          {website}
                        </a>
                      </div>
                    )}
                  </div>

                  {/* Skills */}
                  {skills.length > 0 && (
                    <div className="mt-4">
                      <div className="flex flex-wrap gap-2">
                        {skills.map((skill) => (
                          <span
                            key={skill}
                            className="inline-flex items-center px-2 py-1 rounded-full text-sm bg-primary/10 text-primary border border-primary/20"
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Bio */}
                  {bio && (
                    <div className="mt-6">
                      <p className="text-base whitespace-pre-wrap">{bio}</p>
                    </div>
                  )}

                  {/* Platforms */}
                  {(platforms.length > 0 || loadingPlatforms) && (
                    <div className="mt-6">
                      <h2 className="text-xl font-semibold mb-3">Platforms</h2>
                      {loadingPlatforms ? (
                        <div className="text-sm text-muted-foreground">Loading platforms...</div>
                      ) : platforms.length > 0 ? (
                        <div className="space-y-3">
                          {platforms.map((platform: any) => (
                            <Card key={platform.id} className="hover:shadow-md transition-shadow">
                              <CardContent className="p-4">
                                <Link href={`/platforms/${platform.slug}`} className="block">
                                  <div className="flex items-start gap-3 mb-3">
                                    {platform.branding?.logo && (
                                      <img
                                        src={platform.branding.logo}
                                        alt={platform.name}
                                        className="w-12 h-12 rounded-lg object-cover"
                                      />
                                    )}
                                    <div className="flex-1 min-w-0">
                                      <h3 className="font-semibold truncate">{platform.name}</h3>
                                      {platform.description && (
                                        <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                                          {platform.description}
                                        </p>
                                      )}
                                      <div className="flex items-center gap-2 mt-2">
                                        <Badge variant={platform.role === "owner" ? "default" : "secondary"}>
                                          {platform.role === "owner" ? "Owner" : "Member"}
                                        </Badge>
                                      </div>
                                    </div>
                                  </div>
                                </Link>
                                
                                {/* Communities */}
                                {platform.communities && platform.communities.length > 0 && (
                                  <div className="mt-3 pt-3 border-t">
                                    <p className="text-sm font-medium text-muted-foreground mb-2">
                                      Communities ({platform.communities.length})
                                    </p>
                                    <div className="flex flex-wrap gap-2">
                                      {platform.communities.map((community: any) => (
                                        <Link
                                          key={community.id}
                                          href={`/platforms/${platform.slug}/communities/${community.id}`}
                                          className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-colors"
                                        >
                                          {community.name}
                                        </Link>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  )}
                </>
              ) : (
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="displayName">Name</Label>
                    <Input
                      id="displayName"
                      value={displayName}
                      onChange={(e) => {
                        setDisplayName(e.target.value);
                        // Auto-generate username from name if username is empty
                        if (!username.trim()) {
                          setUsername(generateUsername(e.target.value));
                        }
                      }}
                      placeholder="Your name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="username">Username</Label>
                    <div className="space-y-1">
                      <Input
                        id="username"
                        value={username}
                        onChange={(e) => {
                          const newUsername = e.target.value.toLowerCase().trim().replace(/\s+/g, "").replace(/[^a-z0-9]/g, "");
                          setUsername(newUsername);
                          if (newUsername.length >= 3) {
                            checkUsername(newUsername);
                          } else {
                            setUsernameTaken(null);
                          }
                        }}
                        placeholder="username (no spaces)"
                        className={usernameTaken === true ? "border-destructive" : usernameTaken === false ? "border-green-500" : ""}
                      />
                      {usernameTaken === true && (
                        <p className="text-xs text-destructive">Username already taken</p>
                      )}
                      {usernameTaken === false && username.length >= 3 && (
                        <p className="text-xs text-green-600">Username available</p>
                      )}
                      {!username.trim() && (
                        <p className="text-xs text-muted-foreground">Username will be generated from your name if left empty</p>
                      )}
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="headline">Headline</Label>
                    <Input
                      id="headline"
                      value={headline}
                      onChange={(e) => setHeadline(e.target.value)}
                      placeholder="e.g. Software Engineer at Company"
                    />
                  </div>
                  <div>
                    <Label htmlFor="currentPosition">Current Position</Label>
                    <Input
                      id="currentPosition"
                      value={currentPosition}
                      onChange={(e) => setCurrentPosition(e.target.value)}
                      placeholder="e.g. Senior Developer at Tech Corp"
                    />
                  </div>
                  <div>
                    <Label>Skills</Label>
                    <div className="space-y-2">
                      {/* Selected Skills */}
                      {skills.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-2">
                          {skills.map((skill) => (
                            <span
                              key={skill}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-sm bg-primary/10 text-primary border border-primary/20"
                            >
                              {skill}
                              <button
                                type="button"
                                onClick={() => handleRemoveSkill(skill)}
                                className="hover:text-destructive"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </span>
                          ))}
                        </div>
                      )}
                      
                      {/* Add Skill */}
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setSkillInputOpen(true)}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Skill
                      </Button>
                      <CommandDialog open={skillInputOpen} onOpenChange={setSkillInputOpen}>
                        <CommandInput
                          placeholder="Search or add skill..."
                          value={newSkillInput}
                          onValueChange={setNewSkillInput}
                        />
                        <CommandList>
                          <CommandEmpty>
                            <div className="py-3 px-2">
                              <Button
                                type="button"
                                variant="outline"
                                className="w-full"
                                onClick={() => {
                                  if (newSkillInput.trim()) {
                                    handleAddSkill(newSkillInput);
                                  }
                                }}
                                disabled={!newSkillInput.trim()}
                              >
                                <Plus className="h-4 w-4 mr-2" />
                                Add "{newSkillInput}"
                              </Button>
                            </div>
                          </CommandEmpty>
                          <CommandGroup>
                            {availableSkills
                              .filter(skill => 
                                skill.toLowerCase().includes(newSkillInput.toLowerCase()) &&
                                !skills.includes(skill)
                              )
                              .map((skill) => (
                                <CommandItem
                                  key={skill}
                                  onSelect={() => {
                                    handleAddSkill(skill);
                                  }}
                                >
                                  {skill}
                                </CommandItem>
                              ))}
                          </CommandGroup>
                          {newSkillInput.trim() && !availableSkills.some(s => s.toLowerCase() === newSkillInput.toLowerCase()) && !skills.includes(newSkillInput) && (
                            <CommandGroup>
                              <CommandItem
                                onSelect={() => {
                                  handleAddSkill(newSkillInput);
                                }}
                              >
                                <Plus className="h-4 w-4 mr-2" />
                                Create "{newSkillInput}"
                              </CommandItem>
                            </CommandGroup>
                          )}
                        </CommandList>
                      </CommandDialog>
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="bio">Bio</Label>
                    <Textarea
                      id="bio"
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      placeholder="Tell us about yourself..."
                      rows={5}
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="location">Province</Label>
                      <Select value={location} onValueChange={setLocation}>
                        <SelectTrigger id="location">
                          <SelectValue placeholder="Select a province" />
                        </SelectTrigger>
                        <SelectContent>
                          {provinces.map((province) => (
                            <SelectItem key={province} value={province}>
                              {province}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="website">Website</Label>
                      <Input
                        id="website"
                        value={website}
                        onChange={(e) => setWebsite(e.target.value)}
                        placeholder="https://..."
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="your@email.com"
                      type="email"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={handleSave} disabled={saving}>
                      <Save className="h-4 w-4 mr-2" />
                      {saving ? "Saving..." : "Save Changes"}
                    </Button>
                    <Button variant="outline" onClick={() => setIsEditing(false)}>
                      <X className="h-4 w-4 mr-2" />
                      Cancel
          </Button>
        </div>
      </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


