"use client";

import { useState, useEffect } from "react";
import { VideoLesson } from "@/components/course-lessons/video-lesson";
import { ArticleLesson } from "@/components/course-lessons/article-lesson";
import { QuizLesson } from "@/components/course-lessons/quiz-lesson";
import { YouTubeUrlInput } from "@/components/youtube-url-input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ChevronLeft, ChevronRight, Save, Edit2, Plus, Trash2, Lock } from "lucide-react";
import { useCourseViewer } from "@/components/course-viewer-context";
import { db, auth } from "@/lib/firebase";
import KtdLexicalEditor from "@/components/lexical-editor";
import { doc, updateDoc } from "firebase/firestore";
import { toast } from "sonner";

export default function CourseViewerPage() {
  const {
    course,
    currentLesson,
    handleLessonComplete,
    previousLesson,
    nextLesson,
    setCurrentLessonId,
    completedLessons,
    isOwner,
    isMember,
    platformId,
    platformSlug,
    courseId,
    refreshCourse,
  } = useCourseViewer();
  
  const [editingContent, setEditingContent] = useState(false);
  const [articleContent, setArticleContent] = useState("");
  const [quizQuestions, setQuizQuestions] = useState<any[]>([]);
  const [savingContent, setSavingContent] = useState(false);
  const [articleJSON, setArticleJSON] = useState<any>(null);

  useEffect(() => {
    if (currentLesson) {
      if (currentLesson.type === "article") {
        setArticleContent(currentLesson.content || "");
        setArticleJSON(currentLesson.contentState || null);
      }
      if (currentLesson.type === "quiz") {
        setQuizQuestions(currentLesson.questions || []);
      }
      setEditingContent(false);
    }
  }, [currentLesson]);

  const handleNextLesson = () => {
    if (nextLesson) {
      setCurrentLessonId(nextLesson.id);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handlePreviousLesson = () => {
    if (previousLesson) {
      setCurrentLessonId(previousLesson.id);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  // Helper function to remove undefined values recursively from an object
  const removeUndefined = (obj: any): any => {
    if (obj === null || obj === undefined) {
      return null;
    }
    if (Array.isArray(obj)) {
      return obj.map(removeUndefined).filter(item => item !== undefined);
    }
    if (typeof obj === 'object') {
      const cleaned: any = {};
      for (const key in obj) {
        if (obj.hasOwnProperty(key) && obj[key] !== undefined) {
          cleaned[key] = removeUndefined(obj[key]);
        }
      }
      return cleaned;
    }
    return obj;
  };

  const handleSaveArticleContent = async () => {
    if (!platformId || !courseId || !currentLesson || currentLesson.type !== "article") return;
    
    setSavingContent(true);
    try {
      // Build update data, filtering out undefined values
      const updateData: any = {};
      
      // Always include content (can be empty string)
      updateData.content = articleContent ?? "";
      
      // Only include contentState if it exists and is not null/undefined
      // Clean it recursively to remove all undefined values
      if (articleJSON !== undefined && articleJSON !== null) {
        updateData.contentState = removeUndefined(articleJSON);
      }
      
      // Remove any undefined values from the update object (final check)
      Object.keys(updateData).forEach(key => {
        if (updateData[key] === undefined) {
          delete updateData[key];
        }
      });
      
      console.log("Saving article content:", { content: updateData.content?.substring(0, 50), hasContentState: !!updateData.contentState });
      
      await updateDoc(
        doc(db, "platforms", platformId, "courses", courseId, "sections", currentLesson.sectionId, "lessons", currentLesson.id),
        updateData
      );
      toast.success("Content saved successfully");
      setEditingContent(false);
      await refreshCourse();
    } catch (error) {
      console.error("Failed to save content", error);
      toast.error("Failed to save content");
    } finally {
      setSavingContent(false);
    }
  };

  const handleSaveQuizContent = async () => {
    if (!platformId || !courseId || !currentLesson || currentLesson.type !== "quiz") return;
    
    setSavingContent(true);
    try {
      // Ensure questions is not undefined
      const updateData: any = {
        questions: quizQuestions || []
      };
      
      await updateDoc(
        doc(db, "platforms", platformId, "courses", courseId, "sections", currentLesson.sectionId, "lessons", currentLesson.id),
        updateData
      );
      toast.success("Quiz saved successfully");
      setEditingContent(false);
      await refreshCourse();
    } catch (error) {
      console.error("Failed to save quiz", error);
      toast.error("Failed to save quiz");
    } finally {
      setSavingContent(false);
    }
  };

  const addQuestion = () => {
    setQuizQuestions([
      ...quizQuestions,
      {
        id: `q_${Date.now()}`,
        question: "",
        options: ["", ""],
        correctAnswer: 0,
      },
    ]);
  };

  const updateQuestion = (questionId: string, field: string, value: any) => {
    setQuizQuestions(
      quizQuestions.map((q) =>
        q.id === questionId ? { ...q, [field]: value } : q
      )
    );
  };

  const addOption = (questionId: string) => {
    setQuizQuestions(
      quizQuestions.map((q) =>
        q.id === questionId
          ? { ...q, options: [...q.options, ""] }
          : q
      )
    );
  };

  const updateOption = (questionId: string, optionIndex: number, value: string) => {
    setQuizQuestions(
      quizQuestions.map((q) =>
        q.id === questionId
          ? {
              ...q,
              options: q.options.map((opt: any, idx: number) =>
                idx === optionIndex ? value : opt
              ),
            }
          : q
      )
    );
  };

  const removeOption = (questionId: string, optionIndex: number) => {
    setQuizQuestions(
      quizQuestions.map((q) =>
        q.id === questionId
          ? { ...q, options: q.options.filter((_: any, idx: number) => idx !== optionIndex) }
          : q
      )
    );
  };

  const removeQuestion = (questionId: string) => {
    setQuizQuestions(quizQuestions.filter((q) => q.id !== questionId));
  };


  if (!currentLesson) {
    return (
      <div className="flex min-h-screen items-center justify-center p-8">
        <Card className="p-8">
          <CardTitle>No lesson selected</CardTitle>
          <p className="text-muted-foreground mt-2">
            Please select a lesson from the sidebar to get started.
          </p>
        </Card>
      </div>
    );
  }

  const canEditContent = isOwner && (currentLesson.type === "article" || currentLesson.type === "quiz" || currentLesson.type === "video");
  
  // Check if section has freePreview
  const currentSection = course?.sections.find(section => section.lessons.some(l => l.id === currentLesson.id));
  const hasAccess = isOwner || isMember || currentLesson.freePreview === true || currentSection?.freePreview === true;

  return (
    <div className="p-6">
      {/* Lesson Content */}
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <div className="mb-2 flex items-center gap-2">
                  <Badge variant="outline">{currentLesson.type}</Badge>
                  <span className="text-sm text-muted-foreground">{currentLesson.duration}</span>
                </div>
                <CardTitle className="text-2xl">{currentLesson.title}</CardTitle>
              </div>
              {canEditContent && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setEditingContent(!editingContent);
                  }}
                >
                  {editingContent ? (
                    <>
                      <Edit2 className="h-4 w-4 mr-2" />
                      Cancel Edit
                    </>
                  ) : (
                    <>
                      <Edit2 className="h-4 w-4 mr-2" />
                      Edit Content
                    </>
                  )}
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {!hasAccess ? (
              <div className="flex flex-col items-center justify-center py-16 text-center space-y-4">
                <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <Lock className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-2">This lesson is locked</h3>
                  <p className="text-muted-foreground mb-4">
                    Become a member to access all lessons and courses
                  </p>
                  <Button asChild>
                    <a href={`/platforms/${platformSlug}`}>Become a Member</a>
                  </Button>
                </div>
              </div>
            ) : (
              <>
                {currentLesson.type === "video" && (
                  <div className="space-y-4">
                    {isOwner && editingContent ? (
                      <YouTubeUrlInput
                        value={currentLesson.videoUrl || ""}
                        onChange={(url) => {
                          // URL is tracked internally by YouTubeUrlInput component
                        }}
                        onSave={async (url) => {
                          if (!platformId || !courseId || !currentLesson || currentLesson.type !== "video") return;
                          
                          setSavingContent(true);
                          try {
                            // Find the section containing this lesson
                            const sectionId = course?.sections.find(s => 
                              s.lessons.some(l => l.id === currentLesson.id)
                            )?.id;
                            
                            if (!sectionId) {
                              toast.error("Could not find lesson section");
                              return;
                            }

                            if (!url || !url.trim()) {
                              toast.error("Please provide a YouTube URL");
                              setSavingContent(false);
                              return;
                            }

                            await updateDoc(
                              doc(db, "platforms", platformId, "courses", courseId, "sections", sectionId, "lessons", currentLesson.id),
                              { videoUrl: url.trim() }
                            );

                            toast.success("Video URL saved successfully!");
                            setEditingContent(false);
                            await refreshCourse();
                          } catch (error) {
                            console.error("Failed to save video URL", error);
                            toast.error("Failed to save video URL. Please try again.");
                          } finally {
                            setSavingContent(false);
                          }
                        }}
                        onCancel={() => setEditingContent(false)}
                        saving={savingContent}
                      />
                    ) : (
                      <VideoLesson
                        lesson={currentLesson}
                        isCompleted={completedLessons.has(currentLesson.id)}
                        onComplete={() => handleLessonComplete(currentLesson.id)}
                      />
                    )}
                  </div>
                )}
            {currentLesson.type === "article" && (
              <div className="space-y-4">
                {isOwner && editingContent ? (
                  <div className="space-y-4">
                    {/* Lexical Editor */}
                    <KtdLexicalEditor
                      initialHTML={articleContent}
                      initialJSON={articleJSON}
                      onChangeHTML={(html) => setArticleContent(html)}
                      onChangeJSON={(json) => setArticleJSON(json)}
                    />
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setEditingContent(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleSaveArticleContent} disabled={savingContent}>
                        <Save className="h-4 w-4 mr-2" />
                        {savingContent ? "Saving..." : "Save"}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <ArticleLesson
                    lesson={currentLesson as any}
                    isCompleted={completedLessons.has(currentLesson.id)}
                    onComplete={() => handleLessonComplete(currentLesson.id)}
                  />
                )}
              </div>
            )}
            {currentLesson.type === "quiz" && (
              <div className="space-y-4">
                {isOwner && editingContent ? (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold">Quiz Questions</h3>
                      <Button size="sm" onClick={addQuestion}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Question
                      </Button>
                    </div>
                    {quizQuestions.map((question, qIndex) => (
                      <Card key={question.id}>
                        <CardHeader>
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-base">Question {qIndex + 1}</CardTitle>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeQuestion(question.id)}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div>
                            <Label>Question Text</Label>
                            <Input
                              value={question.question}
                              onChange={(e) =>
                                updateQuestion(question.id, "question", e.target.value)
                              }
                              placeholder="Enter question..."
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Options</Label>
                            {question.options.map((option: string, optIndex: number) => (
                              <div key={optIndex} className="flex items-center gap-2">
                                <input
                                  type="radio"
                                  name={`correct_${question.id}`}
                                  checked={question.correctAnswer === optIndex}
                                  onChange={() =>
                                    updateQuestion(question.id, "correctAnswer", optIndex)
                                  }
                                  className="h-4 w-4"
                                />
                                <Input
                                  value={option}
                                  onChange={(e) =>
                                    updateOption(question.id, optIndex, e.target.value)
                                  }
                                  placeholder={`Option ${optIndex + 1}`}
                                  className="flex-1"
                                />
                                {question.options.length > 2 && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => removeOption(question.id, optIndex)}
                                    className="text-destructive"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>
                            ))}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => addOption(question.id)}
                            >
                              <Plus className="h-4 w-4 mr-2" />
                              Add Option
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                    {quizQuestions.length === 0 && (
                      <div className="text-center py-8 text-sm text-muted-foreground">
                        <p>No questions yet. Click "Add Question" to get started.</p>
                      </div>
                    )}
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setEditingContent(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleSaveQuizContent} disabled={savingContent}>
                        <Save className="h-4 w-4 mr-2" />
                        {savingContent ? "Saving..." : "Save Quiz"}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <QuizLesson
                    lesson={currentLesson}
                    isCompleted={completedLessons.has(currentLesson.id)}
                    onComplete={() => handleLessonComplete(currentLesson.id)}
                  />
                )}
              </div>
            )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Navigation */}
        {hasAccess && (
        <div className="flex items-center justify-between border-t pt-6">
          <Button
            variant="outline"
            onClick={handlePreviousLesson}
            disabled={!previousLesson}
            className="flex items-center gap-2"
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>
          <Button
            onClick={handleNextLesson}
            disabled={!nextLesson}
            className="flex items-center gap-2"
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        )}
      </div>
    </div>
  );
}

