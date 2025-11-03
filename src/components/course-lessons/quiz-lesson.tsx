"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

interface Question {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
}

interface QuizLessonProps {
  lesson: {
    id: string;
    title: string;
    questions?: Question[];
    duration: string;
  };
  onComplete: () => void;
  isCompleted?: boolean;
}

export function QuizLesson({ lesson, onComplete, isCompleted = false }: QuizLessonProps) {
  const questions = lesson.questions || [];
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, number>>({});
  const [showResults, setShowResults] = useState(false);
  const [completed, setCompleted] = useState(!!isCompleted);

  // Sync with persisted completion
  useEffect(() => {
    setCompleted(!!isCompleted);
    if (isCompleted) setShowResults(true);
  }, [isCompleted]);

  const handleAnswerSelect = (questionId: string, answerIndex: number) => {
    setSelectedAnswers((prev) => ({ ...prev, [questionId]: answerIndex }));
  };

  const handleSubmit = () => {
    if (questions.length === 0) {
      toast.error("This quiz has no questions yet.");
      return;
    }
    if (Object.keys(selectedAnswers).length < questions.length) {
      toast.error("Please answer all questions before submitting.");
      return;
    }

    setShowResults(true);
    const correctCount = questions.filter(
      (q) => selectedAnswers[q.id] === q.correctAnswer
    ).length;
    const score = Math.round((correctCount / questions.length) * 100);

    if (score >= 70) {
      toast.success(`Quiz passed! Score: ${score}%`);
      setCompleted(true);
      onComplete();
    } else {
      toast.error(`Quiz score: ${score}%. You need 70% to pass.`);
    }
  };

  const handleRetake = () => {
    setSelectedAnswers({});
    setShowResults(false);
    setCompleted(false);
  };

  const getQuestionResult = (question: Question) => {
    const userAnswer = selectedAnswers[question.id];
    const isCorrect = userAnswer === question.correctAnswer;
    return { isCorrect, userAnswer };
  };

  if (questions.length === 0) {
    return (
      <div className="space-y-4">
        <div className="rounded-lg border p-8 text-center">
          <p className="text-sm text-muted-foreground">
            This quiz has no questions yet. Please contact the course instructor.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {!completed && (
        <div className="rounded-lg border p-4">
          <p className="text-sm text-muted-foreground">
            Answer all questions to complete this quiz. You need at least 70% to pass.
          </p>
        </div>
      )}

      {questions.map((question, index) => {
        const { isCorrect, userAnswer } = showResults ? getQuestionResult(question) : { isCorrect: null, userAnswer: null };

        const selected = selectedAnswers[question.id];
        const radioValue = selected !== undefined
          ? String(selected)
          : (userAnswer != null ? String(userAnswer) : undefined);

        return (
          <Card key={question.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <CardTitle className="text-lg">
                  Question {index + 1} of {questions.length}
                </CardTitle>
                {showResults && (
                  <div className="flex items-center gap-2">
                    {isCorrect ? (
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-500" />
                    )}
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="font-medium">{question.question}</p>
              <RadioGroup
                value={radioValue}
                onValueChange={(value) => handleAnswerSelect(question.id, parseInt(value))}
                disabled={showResults || completed}
              >
                {question.options.map((option, optionIndex) => {
                  const isSelected = selectedAnswers[question.id] === optionIndex;
                  const isCorrectOption = optionIndex === question.correctAnswer;
                  const showCorrect = showResults && isCorrectOption;

                  return (
                    <div
                      key={optionIndex}
                      className={`flex items-center space-x-2 rounded-md p-3 ${
                        showResults
                          ? showCorrect
                            ? "bg-green-50 dark:bg-green-950"
                            : isSelected && !isCorrect
                            ? "bg-red-50 dark:bg-red-950"
                            : ""
                          : isSelected
                          ? "bg-accent"
                          : "hover:bg-accent"
                      }`}
                    >
                      <RadioGroupItem value={optionIndex.toString()} id={`${question.id}-${optionIndex}`} />
                      <Label
                        htmlFor={`${question.id}-${optionIndex}`}
                        className="flex-1 cursor-pointer font-normal"
                      >
                        {option}
                      </Label>
                      {showResults && showCorrect && (
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                      )}
                      {showResults && isSelected && !isCorrect && (
                        <XCircle className="h-4 w-4 text-red-500" />
                      )}
                    </div>
                  );
                })}
              </RadioGroup>
              {showResults && !isCorrect && (
                <p className="text-sm text-muted-foreground">
                  Correct answer: {question.options[question.correctAnswer]}
                </p>
              )}
            </CardContent>
          </Card>
        );
      })}

      {/* Action Buttons */}
      <div className="flex items-center justify-between">
        {completed ? (
          <div className="flex items-center gap-2 rounded-lg bg-primary/10 p-3 text-primary">
            <CheckCircle2 className="h-5 w-5" />
            <span className="text-sm font-medium">You've completed this lesson!</span>
          </div>
        ) : (
          !showResults ? (
            <Button onClick={handleSubmit} disabled={Object.keys(selectedAnswers).length < questions.length}>
              Submit Quiz
            </Button>
          ) : (
            <div className="flex items-center gap-2">
              {!completed && (
                <Button variant="outline" onClick={handleRetake}>
                  Retake Quiz
                </Button>
              )}
            </div>
          )
        )}
      </div>
    </div>
  );
}
