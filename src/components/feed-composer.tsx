"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/auth-provider";
import { LoadingButton } from "@/components/loading-button";
import KtdLexicalEditor from "@/components/lexical-editor";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Calendar, Clock, CalendarCheck, BarChart3, Plus, X, CheckSquare, Radio, Image as ImageIcon } from "lucide-react";

type FeedComposerProps = {
  onAddPost: (content: string, imageFile?: File | null, eventDate?: string | null, polls?: any[] | null) => void;
};

export function FeedComposer({ onAddPost }: FeedComposerProps) {
  const { user } = useAuth();
  const [htmlContent, setHtmlContent] = useState("");
  const [editorKey, setEditorKey] = useState(0);
  const [loading, setLoading] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  const [isEventPost, setIsEventPost] = useState(false);
  const [eventDate, setEventDate] = useState("");
  const [eventTime, setEventTime] = useState("");
  const [polls, setPolls] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  
  // Extract plain text from HTML for validation (strip HTML tags)
  const getPlainText = (html: string) => {
    if (!html) return "";
    const temp = document.createElement("div");
    temp.innerHTML = html;
    return temp.textContent || temp.innerText || "";
  };
  
  const plainText = getPlainText(htmlContent);
  const canPost = plainText.trim().length > 0;

  function handlePost() {
    if (!canPost || loading) return;
    setLoading(true);
    setTimeout(() => {
      const combinedEventDateTime = isEventPost && eventDate && eventTime 
        ? `${eventDate}T${eventTime}` 
        : null;
      const validPolls = polls.length > 0 ? polls.filter(p => p.title && p.options && p.options.some((opt: string) => opt.trim())) : null;
      onAddPost(htmlContent.trim(), imageFile || undefined, combinedEventDateTime, validPolls);
      setHtmlContent("");
      setImageFile(null);
      setImagePreview("");
      setIsEventPost(false);
      setEventDate("");
      setEventTime("");
      setPolls([]);
      if (fileInputRef.current) fileInputRef.current.value = "";
      // Reset Lexical editor by triggering a remount
      setEditorKey(prev => prev + 1);
      setLoading(false);
    }, 300);
  }
  
  const addPoll = () => {
    setPolls([...polls, { title: "", type: "single", options: ["", ""] }]);
  };
  
  const removePoll = (index: number) => {
    setPolls(polls.filter((_: any, i: number) => i !== index));
  };
  
  const updatePollTitle = (index: number, title: string) => {
    const updated = [...polls];
    updated[index].title = title;
    setPolls(updated);
  };
  
  const updatePollType = (index: number, type: string) => {
    const updated = [...polls];
    updated[index].type = type;
    setPolls(updated);
  };
  
  const addPollOption = (pollIndex: number) => {
    const updated = [...polls];
    if (updated[pollIndex].options.length < 6) {
      updated[pollIndex].options.push("");
      setPolls(updated);
    }
  };
  
  const removePollOption = (pollIndex: number, optionIndex: number) => {
    const updated = [...polls];
    if (updated[pollIndex].options.length > 2) {
      updated[pollIndex].options = updated[pollIndex].options.filter((_: any, i: number) => i !== optionIndex);
      setPolls(updated);
    }
  };
  
  const updatePollOption = (pollIndex: number, optionIndex: number, value: string) => {
    const updated = [...polls];
    updated[pollIndex].options[optionIndex] = value;
    setPolls(updated);
  };

  const allowed = !!user && user.role !== "visitor";
  if (!allowed) return null;

  return (
    <div className="rounded-xl border p-3 md:p-4 space-y-3 md:space-y-4">
      <div className="space-y-2">
        <KtdLexicalEditor
          key={editorKey}
          initialHTML=""
          onChangeHTML={(html) => setHtmlContent(html)}
          className="w-full"
          minHeight="60px"
        />
      </div>
      
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-0.5 md:gap-2 overflow-x-auto flex-1 min-w-0 -mx-1 px-1">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e)=>{
              const f = e.target.files?.[0] || null;
              setImageFile(f);
              setImagePreview(f ? URL.createObjectURL(f) : "");
            }}
          />
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => fileInputRef.current?.click()}
            className="shrink-0 h-7 w-7 md:h-auto md:w-auto md:px-3 p-0"
            title={imageFile ? "Change image" : "Attach image"}
          >
            <ImageIcon className="h-3.5 w-3.5 md:h-4 md:w-4 md:mr-2" />
            <span className="hidden md:inline">{imageFile ? "Change image" : "Attach image"}</span>
          </Button>
          {imageFile && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={()=>{ setImageFile(null); setImagePreview(""); if (fileInputRef.current) fileInputRef.current.value = ""; }}
              className="shrink-0 h-7 w-7 md:h-auto md:w-auto md:px-3 p-0"
              title="Remove image"
            >
              <X className="h-3.5 w-3.5 md:h-4 md:w-4 md:ml-2" />
              <span className="hidden md:inline ml-2">Remove</span>
            </Button>
          )}
          <Button 
            variant={isEventPost ? "default" : "outline"} 
            size="sm" 
            onClick={() => {
              setIsEventPost(!isEventPost);
              setPolls([]);
            }}
            className="shrink-0 h-7 w-7 md:h-auto md:w-auto md:px-3 p-0"
            title={isEventPost ? "Event" : "Create Event"}
          >
            <CalendarCheck className="h-3.5 w-3.5 md:h-4 md:w-4 md:mr-2" />
            <span className="hidden md:inline">{isEventPost ? "Event" : "Create Event"}</span>
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={addPoll}
            className="shrink-0 h-7 w-7 md:h-auto md:w-auto md:px-3 p-0"
            title="Add Question"
          >
            <BarChart3 className="h-3.5 w-3.5 md:h-4 md:w-4 md:mr-2" />
            <span className="hidden md:inline">Add Question</span>
          </Button>
        </div>
        <LoadingButton onClick={handlePost} disabled={!canPost} loading={loading} className="shrink-0">
          Post
        </LoadingButton>
      </div>
      
      {isEventPost && (
        <div className="grid grid-cols-2 gap-3 p-3 bg-primary/5 border rounded-lg">
          <div>
            <Label htmlFor="event-date" className="text-xs flex items-center gap-1 mb-1">
              <Calendar className="h-3 w-3" />
              Date
            </Label>
            <Input
              id="event-date"
              type="date"
              value={eventDate}
              onChange={(e) => setEventDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              className="text-sm"
            />
          </div>
          <div>
            <Label htmlFor="event-time" className="text-xs flex items-center gap-1 mb-1">
              <Clock className="h-3 w-3" />
              Time
            </Label>
            <Input
              id="event-time"
              type="time"
              value={eventTime}
              onChange={(e) => setEventTime(e.target.value)}
              className="text-sm"
            />
          </div>
        </div>
      )}
      
      {polls.length > 0 && (
        <div className="space-y-3">
          {polls.map((poll, pollIndex) => (
            <div key={pollIndex} className="p-3 bg-primary/5 border rounded-lg space-y-3">
              <div className="flex items-center justify-between">
                <Input
                  type="text"
                  value={poll.title}
                  onChange={(e) => updatePollTitle(pollIndex, e.target.value)}
                  placeholder="Question title..."
                  className="text-sm font-medium"
                />
                <div className="flex items-center gap-2">
                  <Button
                    variant={poll.type === "single" ? "default" : "outline"}
                    size="sm"
                    onClick={() => updatePollType(pollIndex, "single")}
                    className="h-7 text-xs"
                  >
                    <Radio className="h-3 w-3 mr-1" />
                    Single
                  </Button>
                  <Button
                    variant={poll.type === "multiple" ? "default" : "outline"}
                    size="sm"
                    onClick={() => updatePollType(pollIndex, "multiple")}
                    className="h-7 text-xs"
                  >
                    <CheckSquare className="h-3 w-3 mr-1" />
                    Multiple
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removePoll(pollIndex)}
                    className="h-7 w-7 p-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                {poll.options.map((option: string, optionIndex: number) => (
                  <div key={optionIndex} className="flex items-center gap-2">
                    <Input
                      type="text"
                      value={option}
                      onChange={(e) => updatePollOption(pollIndex, optionIndex, e.target.value)}
                      placeholder={`Option ${optionIndex + 1}`}
                      className="text-sm"
                    />
                    {poll.options.length > 2 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removePollOption(pollIndex, optionIndex)}
                        className="h-8 w-8 p-0"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => addPollOption(pollIndex)}
                disabled={poll.options.length >= 6}
                className="h-7 text-xs w-full"
              >
                <Plus className="h-3 w-3 mr-1" />
                Add Option
              </Button>
            </div>
          ))}
        </div>
      )}
      
      {imagePreview && (
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={imagePreview} alt="preview" className="h-16 w-16 rounded object-cover border" />
          <div className="text-xs text-muted-foreground truncate max-w-[60%]">
            {imageFile?.name}
          </div>
        </div>
      )}
    </div>
  );
}


