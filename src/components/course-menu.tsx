"use client";

import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ChevronDown, ChevronRight, CheckCircle2, Play, FileText, HelpCircle, Plus, MoreVertical, Pencil, Trash2, Lock, Eye } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCourseViewer } from "@/components/course-viewer-context";
import { db, auth } from "@/lib/firebase";
import { collection, addDoc, doc, deleteDoc, updateDoc, serverTimestamp, query, getDocs, orderBy, getDoc, setDoc } from "firebase/firestore";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

export function CourseMenu() {
  const { course, currentLessonId, completedLessons, setCurrentLessonId, isOwner, isMember, platformId, refreshCourse } = useCourseViewer();
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(course?.sections.map((s) => s.id) || [])
  );
  const [addSectionDialogOpen, setAddSectionDialogOpen] = useState(false);
  const [addLessonDialogOpen, setAddLessonDialogOpen] = useState(false);
  const [editingSection, setEditingSection] = useState<any>(null);
  const [editingLesson, setEditingLesson] = useState<any>(null);
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
  const [sectionTitle, setSectionTitle] = useState("");
  const [sectionFreePreview, setSectionFreePreview] = useState(false);
  const [lessonTitle, setLessonTitle] = useState("");
  const [lessonType, setLessonType] = useState<"video" | "article" | "quiz">("video");
  const [lessonDuration, setLessonDuration] = useState("");
  const [lessonContent, setLessonContent] = useState("");
  const [lessonFreePreview, setLessonFreePreview] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmDeleteSectionId, setConfirmDeleteSectionId] = useState<string | null>(null);
  const [confirmDeleteLesson, setConfirmDeleteLesson] = useState<any>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    setExpandedSections(new Set(course?.sections.map((s) => s.id) || []));
  }, [course]);

  if (!course || !platformId) return null;

  const toggleSection = (sectionId: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }
      return next;
    });
  };

  const getLessonIcon = (type: string) => {
    switch (type) {
      case "video":
        return <Play className="h-4 w-4" />;
      case "article":
        return <FileText className="h-4 w-4" />;
      case "quiz":
        return <HelpCircle className="h-4 w-4" />;
      default:
        return <div className="h-4 w-4 rounded-full bg-muted" />;
    }
  };

  const totalLessons = course.sections.reduce((acc, section) => acc + section.lessons.length, 0);
  const completedCount = completedLessons.size;
  const progress = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;

  const handleAddSection = async () => {
    if (!sectionTitle.trim() || !platformId || !course) return;
    
    setSaving(true);
    try {
      const uid = auth.currentUser?.uid;
      if (!uid) {
        toast.error("You must be signed in");
        return;
      }

      // Ensure owner has membership for Firestore rules
      if (isOwner) {
        const membershipRef = doc(db, "platforms", platformId, "members", uid);
        const membershipDoc = await getDoc(membershipRef);
        if (!membershipDoc.exists()) {
          // Create membership document for owner
          await setDoc(membershipRef, {
            role: "owner",
            joinedAt: serverTimestamp(),
          });
        }
      }

      // Get current max order
      const sectionsSnap = await getDocs(
        query(collection(db, "platforms", platformId, "courses", course.id, "sections"), orderBy("order", "desc"))
      );
      const maxOrder = sectionsSnap.docs[0]?.data()?.order ?? -1;

      await addDoc(collection(db, "platforms", platformId, "courses", course.id, "sections"), {
        title: sectionTitle.trim(),
        order: maxOrder + 1,
        createdAt: serverTimestamp(),
        freePreview: sectionFreePreview,
      });

      toast.success("Section added successfully");
      setAddSectionDialogOpen(false);
      setSectionTitle("");
      setSectionFreePreview(false);
      await refreshCourse();
    } catch (error) {
      console.error("Failed to add section", error);
      toast.error("Failed to add section. Please check Firestore security rules.");
    } finally {
      setSaving(false);
    }
  };

  const handleEditSection = async () => {
    if (!sectionTitle.trim() || !editingSection || !platformId || !course) return;
    
    setSaving(true);
    try {
      await updateDoc(doc(db, "platforms", platformId, "courses", course.id, "sections", editingSection.id), {
        title: sectionTitle.trim(),
        freePreview: sectionFreePreview,
      });

      toast.success("Section updated successfully");
      setEditingSection(null);
      setSectionTitle("");
      setSectionFreePreview(false);
      await refreshCourse();
    } catch (error) {
      console.error("Failed to update section", error);
      toast.error("Failed to update section");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSection = async (sectionId: string) => {
    if (!platformId || !course) return;
    
    if (!confirm("Are you sure you want to delete this section? All lessons in this section will be deleted.")) {
      return;
    }

    try {
      await deleteDoc(doc(db, "platforms", platformId, "courses", course.id, "sections", sectionId));
      toast.success("Section deleted successfully");
      await refreshCourse();
    } catch (error) {
      console.error("Failed to delete section", error);
      toast.error("Failed to delete section");
    }
  };

  const handleAddLesson = async () => {
    if (!lessonTitle.trim() || !selectedSectionId || !platformId || !course) return;
    
    setSaving(true);
    try {
      const uid = auth.currentUser?.uid;
      if (!uid) {
        toast.error("You must be signed in");
        return;
      }

      // Ensure owner has membership for Firestore rules
      if (isOwner) {
        const membershipRef = doc(db, "platforms", platformId, "members", uid);
        const membershipDoc = await getDoc(membershipRef);
        if (!membershipDoc.exists()) {
          // Create membership document for owner
          await setDoc(membershipRef, {
            role: "owner",
            joinedAt: serverTimestamp(),
          });
        }
      }

      // Get current max order for lessons in this section
      const lessonsSnap = await getDocs(
        query(collection(db, "platforms", platformId, "courses", course.id, "sections", selectedSectionId, "lessons"), orderBy("order", "desc"))
      );
      const maxOrder = lessonsSnap.docs[0]?.data()?.order ?? -1;

      const lessonData: any = {
        title: lessonTitle.trim(),
        type: lessonType,
        duration: lessonDuration.trim() || "0 min",
        order: maxOrder + 1,
        createdAt: serverTimestamp(),
        freePreview: lessonFreePreview,
      };

      if (lessonType === "article") {
        lessonData.content = lessonContent.trim();
      }

      await addDoc(collection(db, "platforms", platformId, "courses", course.id, "sections", selectedSectionId, "lessons"), lessonData);

      toast.success("Lesson added successfully");
      setAddLessonDialogOpen(false);
      setLessonTitle("");
      setLessonType("video");
      setLessonDuration("");
      setLessonContent("");
      setLessonFreePreview(false);
      setSelectedSectionId(null);
      await refreshCourse();
    } catch (error) {
      console.error("Failed to add lesson", error);
      toast.error("Failed to add lesson. Please check Firestore security rules.");
    } finally {
      setSaving(false);
    }
  };

  const handleEditLesson = async () => {
    if (!lessonTitle.trim() || !editingLesson || !platformId || !course) return;
    
    setSaving(true);
    try {
      const lessonData: any = {
        title: lessonTitle.trim(),
        type: lessonType,
        duration: lessonDuration.trim() || "0 min",
        freePreview: lessonFreePreview,
      };

      if (lessonType === "article") {
        lessonData.content = lessonContent.trim();
      }

      await updateDoc(
        doc(db, "platforms", platformId, "courses", course.id, "sections", editingLesson.sectionId, "lessons", editingLesson.id),
        lessonData
      );

      toast.success("Lesson updated successfully");
      setEditingLesson(null);
      setLessonTitle("");
      setLessonType("video");
      setLessonDuration("");
      setLessonContent("");
      setLessonFreePreview(false);
      await refreshCourse();
    } catch (error) {
      console.error("Failed to update lesson", error);
      toast.error("Failed to update lesson");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteLesson = async (lesson: any) => {
    if (!platformId || !course) return;
    
    if (!confirm("Are you sure you want to delete this lesson?")) {
      return;
    }

    try {
      await deleteDoc(
        doc(db, "platforms", platformId, "courses", course.id, "sections", lesson.sectionId, "lessons", lesson.id)
      );
      toast.success("Lesson deleted successfully");
      await refreshCourse();
    } catch (error) {
      console.error("Failed to delete lesson", error);
      toast.error("Failed to delete lesson");
    }
  };

  const handleDeleteSectionConfirmed = async () => {
    if (!platformId || !course || !confirmDeleteSectionId) return;
    setDeleting(true);
    try {
      await deleteDoc(doc(db, "platforms", platformId, "courses", course.id, "sections", confirmDeleteSectionId));
      toast.success("Section deleted successfully");
      setConfirmDeleteSectionId(null);
      await refreshCourse();
    } catch (error) {
      console.error("Failed to delete section", error);
      toast.error("Failed to delete section");
    } finally {
      setDeleting(false);
    }
  };

  const handleDeleteLessonConfirmed = async () => {
    if (!platformId || !course || !confirmDeleteLesson) return;
    setDeleting(true);
    try {
      await deleteDoc(
        doc(db, "platforms", platformId, "courses", course.id, "sections", confirmDeleteLesson.sectionId, "lessons", confirmDeleteLesson.id)
      );
      toast.success("Lesson deleted successfully");
      setConfirmDeleteLesson(null);
      await refreshCourse();
    } catch (error) {
      console.error("Failed to delete lesson", error);
      toast.error("Failed to delete lesson");
    } finally {
      setDeleting(false);
    }
  };

  const openAddSectionDialog = () => {
    setSectionTitle("");
    setSectionFreePreview(false);
    setEditingSection(null);
    setAddSectionDialogOpen(true);
  };

  const openEditSectionDialog = (section: any) => {
    setSectionTitle(section.title);
    setSectionFreePreview(section.freePreview || false);
    setEditingSection(section);
    setAddSectionDialogOpen(true);
  };

  const openAddLessonDialog = (sectionId: string) => {
    setLessonTitle("");
    setLessonType("video");
    setLessonDuration("");
    setLessonContent("");
    setLessonFreePreview(false);
    setSelectedSectionId(sectionId);
    setEditingLesson(null);
    setAddLessonDialogOpen(true);
  };

  const openEditLessonDialog = (lesson: any) => {
    setLessonTitle(lesson.title);
    setLessonType(lesson.type || "video");
    setLessonDuration(lesson.duration || "");
    setLessonContent(lesson.content || "");
    setLessonFreePreview(lesson.freePreview || false);
    setEditingLesson(lesson);
    setAddLessonDialogOpen(true);
  };

  return (
    <>
      <div className="h-full flex flex-col">
        {/* Course Header */}
        <div className="p-6 border-b">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">{course.title}</h2>
            {isOwner && (
              <Button size="sm" onClick={openAddSectionDialog}>
                <Plus className="h-4 w-4 mr-1" />
                Section
              </Button>
            )}
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Course Progress */}
          <div className="rounded-lg border p-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Course Progress</span>
                <span className="font-medium">{progress}%</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full bg-primary transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                {completedCount} of {totalLessons} lessons completed
              </p>
            </div>
          </div>

          {/* Course Content */}
          <div className="space-y-1">
            {course.sections.map((section) => {
              const isExpanded = expandedSections.has(section.id);
              const sectionLessons = section.lessons.length;
              const sectionCompleted = section.lessons.filter((l) => completedLessons.has(l.id)).length;

              return (
                <div key={section.id} className="space-y-1">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleSection(section.id)}
                      className="flex-1 flex items-center justify-between rounded-md px-3 py-2 text-left text-sm font-medium hover:bg-accent"
                    >
                      <div className="flex items-center gap-2">
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                        <span>{section.title}</span>
                        {section.freePreview && (
                          <Eye className="h-3.5 w-3.5 text-primary" aria-label="Free Preview" />
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {sectionCompleted}/{sectionLessons}
                      </span>
                    </button>
                    {isOwner && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEditSectionDialog(section)}>
                            <Pencil className="h-4 w-4 mr-2" />
                            Edit Section
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openAddLessonDialog(section.id)}>
                            <Plus className="h-4 w-4 mr-2" />
                            Add Lesson
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => setConfirmDeleteSectionId(section.id)}
                            className="text-destructive focus:text-destructive focus:bg-destructive/10"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete Section
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>

                  {isExpanded && (
                    <div className="ml-6 space-y-1">
                      {section.lessons.map((lesson) => {
                        const isActive = currentLessonId === lesson.id;
                        const isCompleted = completedLessons.has(lesson.id);

                        const hasAccess = isOwner || isMember || lesson.freePreview === true || section.freePreview === true;
                        
                        return (
                          <div key={lesson.id} className="flex items-center gap-2">
                            <button
                              onClick={() => hasAccess && setCurrentLessonId(lesson.id)}
                              disabled={!hasAccess}
                              className={cn(
                                "flex-1 flex items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors",
                                hasAccess 
                                  ? isActive
                                    ? "bg-primary text-primary-foreground"
                                    : "hover:bg-accent"
                                  : "opacity-50 cursor-not-allowed",
                                isCompleted && !isActive && hasAccess && "text-muted-foreground"
                              )}
                              aria-label={!hasAccess ? "Become a member to access this lesson" : undefined}
                            >
                              {!hasAccess ? (
                                <Lock className="h-4 w-4 text-muted-foreground" />
                              ) : isCompleted ? (
                                <CheckCircle2 className="h-4 w-4 text-primary" />
                              ) : (
                                getLessonIcon(lesson.type)
                              )}
                              <span className="flex-1 truncate">{lesson.title}</span>
                              {(lesson.freePreview || section.freePreview) && (
                                <Eye className="h-3.5 w-3.5 text-primary" aria-label="Free Preview" />
                              )}
                              {!hasAccess ? (
                                <span className="text-xs opacity-70">Locked</span>
                              ) : (
                                <span className="text-xs opacity-70">{lesson.duration}</span>
                              )}
                            </button>
                            {isOwner && (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => openEditLessonDialog(lesson)}>
                                    <Pencil className="h-4 w-4 mr-2" />
                                    Edit Lesson
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() => setConfirmDeleteLesson(lesson)}
                                    className="text-destructive focus:text-destructive focus:bg-destructive/10"
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Delete Lesson
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            )}
                          </div>
                        );
                      })}
                      {isOwner && section.lessons.length === 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openAddLessonDialog(section.id)}
                          className="w-full justify-start text-muted-foreground"
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Add first lesson
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
            {course.sections.length === 0 && isOwner && (
              <div className="text-center py-8 text-sm text-muted-foreground">
                <p>No sections yet</p>
                <Button variant="outline" size="sm" onClick={openAddSectionDialog} className="mt-2">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Section
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add/Edit Section Dialog */}
      <Dialog open={addSectionDialogOpen} onOpenChange={setAddSectionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingSection ? "Edit Section" : "Add Section"}</DialogTitle>
            <DialogDescription>
              {editingSection ? "Update the section title" : "Create a new section for this course"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="section-title">Title</Label>
              <Input
                id="section-title"
                value={sectionTitle}
                onChange={(e) => setSectionTitle(e.target.value)}
                placeholder="e.g. Introduction, Getting Started"
              />
            </div>
            <div className="flex items-center justify-between py-2">
              <div className="space-y-0.5">
                <Label htmlFor="section-free-preview">Free Preview</Label>
                <p className="text-sm text-muted-foreground">
                  Allow non-members to access all lessons in this section
                </p>
              </div>
              <Switch
                id="section-free-preview"
                checked={sectionFreePreview}
                onCheckedChange={setSectionFreePreview}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setAddSectionDialogOpen(false);
              setSectionTitle("");
              setSectionFreePreview(false);
              setEditingSection(null);
            }}>
              Cancel
            </Button>
            <Button onClick={editingSection ? handleEditSection : handleAddSection} disabled={!sectionTitle.trim() || saving}>
              {saving ? "Saving..." : editingSection ? "Update" : "Add"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add/Edit Lesson Dialog */}
      <Dialog open={addLessonDialogOpen} onOpenChange={setAddLessonDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingLesson ? "Edit Lesson" : "Add Lesson"}</DialogTitle>
            <DialogDescription>
              {editingLesson ? "Update the lesson details" : "Create a new lesson for this section"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="lesson-title">Title</Label>
              <Input
                id="lesson-title"
                value={lessonTitle}
                onChange={(e) => setLessonTitle(e.target.value)}
                placeholder="e.g. Introduction to React"
              />
            </div>
            <div>
              <Label htmlFor="lesson-type">Type</Label>
              <select
                id="lesson-type"
                value={lessonType}
                onChange={(e) => setLessonType(e.target.value as "video" | "article" | "quiz")}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="video">Video</option>
                <option value="article">Article</option>
                <option value="quiz">Quiz</option>
              </select>
            </div>
            <div>
              <Label htmlFor="lesson-duration">Duration</Label>
              <Input
                id="lesson-duration"
                value={lessonDuration}
                onChange={(e) => setLessonDuration(e.target.value)}
                placeholder="e.g. 10 min, 5:30"
              />
            </div>
            <div className="flex items-center justify-between py-2">
              <div className="space-y-0.5">
                <Label htmlFor="lesson-free-preview">Free Preview</Label>
                <p className="text-sm text-muted-foreground">
                  Allow non-members to access this lesson
                </p>
              </div>
              <Switch
                id="lesson-free-preview"
                checked={lessonFreePreview}
                onCheckedChange={setLessonFreePreview}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setAddLessonDialogOpen(false);
              setLessonTitle("");
              setLessonType("video");
              setLessonDuration("");
              setLessonContent("");
              setLessonFreePreview(false);
              setSelectedSectionId(null);
              setEditingLesson(null);
            }}>
              Cancel
            </Button>
            <Button onClick={editingLesson ? handleEditLesson : handleAddLesson} disabled={!lessonTitle.trim() || saving}>
              {saving ? "Saving..." : editingLesson ? "Update" : "Add"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Section Confirmation */}
      <Dialog open={!!confirmDeleteSectionId} onOpenChange={(open) => { if (!open) setConfirmDeleteSectionId(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Section</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this section? All lessons in this section will be removed. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDeleteSectionId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteSectionConfirmed} disabled={deleting}>
              {deleting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Lesson Confirmation */}
      <Dialog open={!!confirmDeleteLesson} onOpenChange={(open) => { if (!open) setConfirmDeleteLesson(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Lesson</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this lesson? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDeleteLesson(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteLessonConfirmed} disabled={deleting}>
              {deleting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
