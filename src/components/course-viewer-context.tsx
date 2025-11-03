"use client";

import * as React from "react";
import { db, auth } from "@/lib/firebase";
import { collection, doc, getDoc, getDocs, query, where, orderBy, serverTimestamp, setDoc, updateDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";

export type LessonType = "video" | "article" | "quiz";

export interface Lesson {
  id: string;
  title: string;
  type: LessonType;
  duration: string;
  order: number;
  sectionId: string;
  [key: string]: any;
}

export interface Course {
  id: string;
  title: string;
  description: string;
  instructor?: string;
  duration?: string;
  totalLessons: number;
  sections: Array<{
    id: string;
    title: string;
    freePreview?: boolean;
    lessons: Lesson[];
  }>;
}

type CourseViewerContextValue = {
  course: Course | null;
  currentLessonId: string | null;
  completedLessons: Set<string>;
  setCurrentLessonId: (lessonId: string) => void;
  setCompletedLessons: (lessons: Set<string>) => void;
  handleLessonComplete: (lessonId: string) => void;
  allLessons: Lesson[];
  currentLesson: Lesson | null;
  currentIndex: number;
  previousLesson: Lesson | null;
  nextLesson: Lesson | null;
  loading: boolean;
  isOwner: boolean;
  isMember: boolean;
  platformId: string | null;
  platformSlug: string;
  courseId: string;
  refreshCourse: () => Promise<void>;
};

const CourseViewerContext = React.createContext<CourseViewerContextValue | undefined>(undefined);

export function CourseViewerProvider({ 
  children, 
  platformSlug,
  courseId 
}: { 
  children: React.ReactNode;
  platformSlug?: string;
  courseId: string;
}) {
  const [currentLessonId, setCurrentLessonId] = React.useState<string | null>(null);
  const [completedLessons, setCompletedLessons] = React.useState<Set<string>>(new Set());
  const [course, setCourse] = React.useState<Course | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [platformId, setPlatformId] = React.useState<string | null>(null);
  const [currentPlatformSlug, setCurrentPlatformSlug] = React.useState<string | undefined>(platformSlug);
  const [isOwner, setIsOwner] = React.useState(false);
  const [isMember, setIsMember] = React.useState(false);
  const [userId, setUserId] = React.useState<string | null>(null);

  // Load user progress separately
  const loadUserProgress = React.useCallback(async (uid: string, pid: string) => {
    try {
      const enrollmentRef = doc(db, "platforms", pid, "courses", courseId, "enrollments", uid);
      const enrollmentDoc = await getDoc(enrollmentRef);
      if (enrollmentDoc.exists()) {
        const enrollmentData = enrollmentDoc.data();
        const completed = enrollmentData.completedLessons || [];
        console.log("Loaded user progress:", completed);
        setCompletedLessons(new Set(completed));
      } else {
        console.log("No enrollment found for user");
        setCompletedLessons(new Set());
      }
    } catch (error) {
      console.error("Failed to load user progress", error);
      setCompletedLessons(new Set());
    }
  }, [courseId]);

  const loadCourse = React.useCallback(async () => {
    try {
      setLoading(true);
      let platformDoc;
      
      if (platformSlug) {
        // Find platform by slug
        const platformsSnap = await getDocs(query(collection(db, "platforms"), where("slug", "==", platformSlug)));
        platformDoc = platformsSnap.docs[0];
      } else {
        // If no platformSlug provided, search for course across all platforms
        const platformsSnap = await getDocs(collection(db, "platforms"));
        for (const platformDocSnapshot of platformsSnap.docs) {
          const courseDoc = await getDoc(doc(db, "platforms", platformDocSnapshot.id, "courses", courseId));
          if (courseDoc.exists()) {
            platformDoc = platformDocSnapshot;
            break;
          }
        }
      }
      
      if (!platformDoc) {
        setLoading(false);
        return;
      }

      const pid = platformDoc.id;
      setPlatformId(pid);
      if (!platformSlug && platformDoc.data()) {
        const platformData: any = platformDoc.data();
        if (platformData.slug) {
          setCurrentPlatformSlug(platformData.slug);
        }
      }

      // Check if user is owner
      const platformData = platformDoc.data();
      const uid = auth.currentUser?.uid;
      setUserId(uid || null);
      setIsOwner(!!(uid && platformData.ownerId === uid));

      // Check if user is member
      if (uid) {
        const memberDoc = await getDoc(doc(db, "platforms", pid, "members", uid));
        setIsMember(memberDoc.exists());
        await loadUserProgress(uid, pid);
      } else {
        setIsMember(false);
        setCompletedLessons(new Set());
      }

      // Load course
      const courseDoc = await getDoc(doc(db, "platforms", pid, "courses", courseId));
      if (!courseDoc.exists()) {
        setLoading(false);
        return;
      }

      const courseData = courseDoc.data();
      
      // Load sections
      try {
        const sectionsSnap = await getDocs(
          query(collection(db, "platforms", pid, "courses", courseId, "sections"), orderBy("order"))
        );
        
        const sectionsPromises = sectionsSnap.docs.map(async (sectionDoc) => {
          const sectionData = sectionDoc.data();
          
          // Load lessons for this section
          try {
            const lessonsSnap = await getDocs(
              query(collection(db, "platforms", pid, "courses", courseId, "sections", sectionDoc.id, "lessons"), orderBy("order"))
            );
            
            const lessons = lessonsSnap.docs.map((lessonDoc) => ({
              id: lessonDoc.id,
              sectionId: sectionDoc.id,
              ...lessonDoc.data(),
            })) as Lesson[];

            return {
              id: sectionDoc.id,
              title: sectionData.title || "",
              freePreview: sectionData.freePreview || false,
              lessons,
            };
          } catch (error) {
            console.error("Failed to load lessons for section", sectionDoc.id, error);
            return {
              id: sectionDoc.id,
              title: sectionData.title || "",
              freePreview: sectionData.freePreview || false,
              lessons: [],
            };
          }
        });

        const sections = await Promise.all(sectionsPromises);
        
        const totalLessons = sections.reduce((acc, section) => acc + section.lessons.length, 0);

        setCourse({
          id: courseDoc.id,
          title: courseData.title || "",
          description: courseData.description || "",
          instructor: courseData.instructor,
          duration: courseData.duration,
          totalLessons,
          sections,
        });
      } catch (error) {
        // No sections yet, create empty course
        setCourse({
          id: courseDoc.id,
          title: courseData.title || "",
          description: courseData.description || "",
          instructor: courseData.instructor,
          duration: courseData.duration,
          totalLessons: 0,
          sections: [],
        });
      }
    } catch (error) {
      console.error("Failed to load course", error);
    } finally {
      setLoading(false);
    }
  }, [platformSlug, courseId, loadUserProgress]);

  React.useEffect(() => {
    loadCourse();
  }, [loadCourse]);

  // Listen to auth state changes and reload progress
  React.useEffect(() => {
    if (!platformId || !courseId) return;
    
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user && platformId) {
        await loadUserProgress(user.uid, platformId);
      } else {
        setCompletedLessons(new Set());
      }
    });

    return () => unsubscribe();
  }, [platformId, courseId, loadUserProgress]);

  const refreshCourse = React.useCallback(async () => {
    await loadCourse();
    // Reload progress after course is refreshed
    const currentUser = auth.currentUser;
    if (currentUser && platformId) {
      await loadUserProgress(currentUser.uid, platformId);
    }
  }, [loadCourse, platformId, loadUserProgress]);

  // Flatten all lessons from all sections
  const allLessons: Lesson[] = React.useMemo(() => {
    if (!course) return [];
    return course.sections.flatMap((section) =>
      section.lessons.map((lesson) => ({ ...lesson, sectionId: section.id }))
    );
  }, [course]);

  const currentLesson = allLessons.find((l) => l.id === currentLessonId) || null;
  const currentIndex = allLessons.findIndex((l) => l.id === currentLessonId);
  const previousLesson = currentIndex > 0 ? allLessons[currentIndex - 1] : null;
  const nextLesson = currentIndex < allLessons.length - 1 ? allLessons[currentIndex + 1] : null;

  // Set first lesson as default if no lesson is selected
  React.useEffect(() => {
    if (!currentLessonId && allLessons.length > 0) {
      setCurrentLessonId(allLessons[0].id);
    }
  }, [currentLessonId, allLessons]);

  const handleLessonComplete = React.useCallback(async (lessonId: string) => {
    // Update local state immediately using functional update
    let updatedCompleted: string[] = [];
    
    setCompletedLessons((prev) => {
      const newSet = new Set(prev);
      newSet.add(lessonId);
      updatedCompleted = Array.from(newSet);
      return newSet;
    });
    
    // Save to Firestore if user is signed in
    if (!userId || !platformId || !courseId) return;
    
    try {
      const enrollmentRef = doc(db, "platforms", platformId, "courses", courseId, "enrollments", userId);
      const enrollmentDoc = await getDoc(enrollmentRef);
      
      if (enrollmentDoc.exists()) {
        // Update existing enrollment
        await updateDoc(enrollmentRef, {
          completedLessons: updatedCompleted,
          lastAccessed: serverTimestamp(),
        });
      } else {
        // Create new enrollment
        await setDoc(enrollmentRef, {
          completedLessons: updatedCompleted,
          enrolledAt: serverTimestamp(),
          lastAccessed: serverTimestamp(),
        });
      }
    } catch (error) {
      console.error("Failed to save lesson completion", error);
      // Revert local state on error
      setCompletedLessons((prev) => {
        const newSet = new Set(prev);
        newSet.delete(lessonId);
        return newSet;
      });
    }
  }, [userId, platformId, courseId]);

  const value: CourseViewerContextValue = {
    course,
    currentLessonId,
    completedLessons,
    setCurrentLessonId,
    setCompletedLessons,
    handleLessonComplete,
    allLessons,
    currentLesson,
    currentIndex,
    previousLesson,
    nextLesson,
    loading,
    isOwner,
    isMember,
    platformId,
    platformSlug: currentPlatformSlug || platformSlug || "",
    courseId,
    refreshCourse,
  };

  return (
    <CourseViewerContext.Provider value={value}>
      {children}
    </CourseViewerContext.Provider>
  );
}

export function useCourseViewer() {
  const context = React.useContext(CourseViewerContext);
  if (!context) {
    throw new Error("useCourseViewer must be used within a CourseViewerProvider");
  }
  return context;
}
