"use client";

import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import KtdLexicalEditor from "@/components/lexical-editor";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  Heart, 
  MessageCircle, 
  Share2, 
  Bookmark, 
  MoreHorizontal,
  ThumbsUp,
  Lightbulb,
  Trash2,
  Link as LinkIcon,
  Pencil,
  Pin,
  PinOff,
  MessageSquareX,
  Download,
  Calendar,
  CalendarCheck,
  Clock,
  BarChart3,
  Plus,
  X,
  CheckSquare,
  Radio
} from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { formatRelativeTime } from "@/lib/format";
import { jsPDF } from "jspdf";

// Event Countdown component
function EventCountdown({ eventDate, primaryColor }: { eventDate: string; primaryColor?: string }) {
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    isPast: false
  });

  useEffect(() => {
    function updateCountdown() {
      const now = new Date().getTime();
      const event = new Date(eventDate).getTime();
      const difference = event - now;

      if (difference <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, isPast: true });
        return;
      }

      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((difference % (1000 * 60)) / 1000);

      setTimeLeft({ days, hours, minutes, seconds, isPast: false });
    }

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [eventDate]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Helper to create lighter color from hex
  const getLighterColor = (hex: string, opacity: number = 0.1) => {
    // Convert hex to RGB
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
  };

  const color = primaryColor || "#66b132"; // Default brand color

  if (timeLeft.isPast) {
    return (
      <div className="bg-gradient-to-br from-red-50 to-orange-50 border border-red-200 rounded-lg p-4 mt-3">
        <div className="flex items-center gap-2 text-red-700 mb-2">
          <Calendar className="h-4 w-4" />
          <span className="font-semibold text-sm">Event Passed</span>
        </div>
        <div className="text-sm text-red-600">{formatDate(eventDate)}</div>
      </div>
    );
  }

  return (
    <div className="border rounded-lg p-4 mt-3" style={{ 
      background: `linear-gradient(to bottom right, ${getLighterColor(color, 0.08)}, ${getLighterColor(color, 0.05)})`,
      borderColor: getLighterColor(color, 0.3)
    }}>
      <div className="flex items-center gap-2 mb-3" style={{ color }}>
        <Calendar className="h-4 w-4" />
        <span className="font-semibold text-sm">Upcoming Event</span>
      </div>
      <div className="text-sm mb-3" style={{ color, opacity: 0.8 }}>{formatDate(eventDate)}</div>
      <div className="grid grid-cols-4 gap-2">
        {[
          { value: timeLeft.days, label: 'Days' },
          { value: timeLeft.hours, label: 'Hours' },
          { value: timeLeft.minutes, label: 'Mins' },
          { value: timeLeft.seconds, label: 'Secs' },
        ].map((item, idx) => (
          <div key={idx} className="bg-white rounded-lg p-2 text-center" style={{ borderColor: getLighterColor(color, 0.2) }}>
            <div className="text-2xl font-bold" style={{ color }}>{item.value}</div>
            <div className="text-xs" style={{ color, opacity: 0.8 }}>{item.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// URL Preview component
function URLPreview({ url }: { url: string }) {
  const [preview, setPreview] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPreview() {
      try {
        setLoading(true);
        // Use a proxy service to fetch OG metadata
        const response = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(url)}`);
        const data = await response.json();
        const html = data.contents;
        
        // Parse OG meta tags
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        
        const ogTitle = doc.querySelector('meta[property="og:title"]')?.getAttribute('content') || 
                       doc.querySelector('title')?.textContent || 
                       new URL(url).hostname;
        const ogDescription = doc.querySelector('meta[property="og:description"]')?.getAttribute('content') || '';
        const ogImage = doc.querySelector('meta[property="og:image"]')?.getAttribute('content') || '';
        const ogUrl = doc.querySelector('meta[property="og:url"]')?.getAttribute('content') || url;
        
        setPreview({ title: ogTitle, description: ogDescription, image: ogImage, url: ogUrl });
      } catch (error) {
        console.error('Failed to fetch preview:', error);
        setPreview({ title: new URL(url).hostname, description: '', image: '', url });
      } finally {
        setLoading(false);
      }
    }
    
    fetchPreview();
  }, [url]);

  if (loading) {
    return (
      <div className="border rounded-lg p-3 bg-muted/30 animate-pulse">
        <div className="h-4 w-3/4 bg-muted rounded mb-2"></div>
        <div className="h-3 w-full bg-muted rounded"></div>
      </div>
    );
  }

  if (!preview) return null;

  return (
    <a 
      href={preview.url} 
      target="_blank" 
      rel="noopener noreferrer"
      className="block border rounded-lg overflow-hidden hover:bg-muted/50 transition-colors mt-2"
    >
      {preview.image && (
        <div className="w-full h-48 bg-muted">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview.image} alt={preview.title} className="w-full h-full object-cover" />
        </div>
      )}
      <div className="p-3">
        <div className="font-medium text-sm line-clamp-2">{preview.title}</div>
        {preview.description && (
          <div className="text-xs text-muted-foreground line-clamp-2 mt-1">{preview.description}</div>
        )}
        <div className="text-xs text-muted-foreground mt-2 truncate">{new URL(preview.url).hostname}</div>
      </div>
    </a>
  );
}

// Single Poll Display component
function SinglePollDisplay({ 
  title,
  type,
  pollOptions, 
  pollVotes, 
  pollVoters, 
  userId, 
  primaryColor,
  onVote
}: { 
  title?: string;
  type?: "single" | "multiple";
  pollOptions?: string[];
  pollVotes?: number[];
  pollVoters?: string[];
  userId?: string;
  primaryColor?: string;
  onVote?: (optionIndex: number) => void;
}) {
  if (!pollOptions || pollOptions.length === 0) return null;
  
  const votes = pollVotes || pollOptions.map(() => 0);
  const totalVotes = votes.reduce((sum, v) => sum + v, 0);
  // Voters format: array of objects { optionIndex, userId } for new format, or array of userIds for legacy
  const hasVoted = userId && pollVoters?.some((v: any) => 
    typeof v === 'string' ? v === userId : v.userId === userId
  );
  const userSelectedOptions = userId
    ? pollVoters?.filter((v: any) => 
        typeof v === 'string' ? v === userId : v.userId === userId
      ).map((v: any) => typeof v === 'object' ? v.optionIndex : 0) || []
    : [];
  const color = primaryColor || "#66b132";
  
  // Helper to create lighter color from hex
  const getLighterColor = (hex: string, opacity: number = 0.1) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
  };

  return (
    <div className="border rounded-lg p-4" style={{ 
      backgroundColor: getLighterColor(color, 0.03),
      borderColor: getLighterColor(color, 0.2)
    }}>
      <div className="flex items-center gap-2 mb-3" style={{ color }}>
        {type === "multiple" ? <CheckSquare className="h-4 w-4" /> : <Radio className="h-4 w-4" />}
        <span className="font-semibold text-sm">{title || "Poll"}</span>
        {totalVotes > 0 && (
          <span className="text-xs text-muted-foreground ml-auto">
            {totalVotes} {totalVotes === 1 ? 'vote' : 'votes'}
          </span>
        )}
      </div>
      <div className="space-y-2">
        {pollOptions.map((option, index) => {
          const optionVotes = votes[index] || 0;
          const percentage = totalVotes > 0 ? (optionVotes / totalVotes) * 100 : 0;
          const isSelected = userSelectedOptions.includes(index);
          
          return (
            <button
              key={index}
              onClick={() => {
                onVote?.(index);
              }}
              className={cn(
                "w-full relative overflow-hidden rounded-lg border text-left transition-all hover:opacity-80 cursor-pointer",
                (percentage > 0 || isSelected) && "border-opacity-40"
              )}
              style={{
                borderColor: (percentage > 0 || isSelected) ? color : getLighterColor(color, 0.3),
              }}
            >
              {/* Background fill for percentage */}
              {hasVoted && (
                <div 
                  className="absolute inset-0 transition-all duration-300"
                  style={{
                    backgroundColor: getLighterColor(color, 0.15),
                    width: `${percentage}%`
                  }}
                />
              )}
              
              <div className="relative p-3 flex items-center justify-between">
                <span className={cn(
                  "text-sm font-medium flex items-center gap-2",
                  (percentage > 0 || isSelected) && "font-semibold"
                )} style={{ color: (percentage > 0 || isSelected) ? color : undefined }}>
                  {type === "multiple" && (
                    <CheckSquare className={cn(
                      "h-4 w-4",
                      isSelected ? "fill-current" : "stroke-current opacity-30"
                    )} />
                  )}
                  {type === "single" && (
                    <Radio className={cn(
                      "h-4 w-4",
                      isSelected ? "fill-current" : "stroke-current opacity-30"
                    )} />
                  )}
                  {option}
                </span>
                {hasVoted && optionVotes > 0 && (
                  <span className="text-xs font-semibold" style={{ color }}>
                    {Math.round(percentage)}%
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// Multiple Polls Display component
function PollsDisplay({ 
  polls,
  userId, 
  primaryColor,
  onVote 
}: { 
  polls?: any[];
  userId?: string;
  primaryColor?: string;
  onVote?: (pollIndex: number, optionIndex: number) => void;
}) {
  if (!polls || polls.length === 0) return null;
  
  return (
    <div className="space-y-3 mt-3">
      {polls.map((poll, pollIndex) => (
        <SinglePollDisplay
          key={pollIndex}
          title={poll.title}
          type={poll.type}
          pollOptions={poll.options}
          pollVotes={poll.votes}
          pollVoters={poll.voters}
          userId={userId}
          primaryColor={primaryColor}
          onVote={(optionIndex) => onVote?.(pollIndex, optionIndex)}
        />
      ))}
    </div>
  );
}

interface EnhancedPostCardProps {
  post: {
    id: string;
    authorId: string;
    authorName: string;
    authorAvatar?: string;
    communityId: string;
    communityName: string;
    platformName?: string;
    platformSlug?: string;
    platformPrimaryColor?: string;
    content: string;
    createdAt: string;
    likes: number;
    comments: number;
    shares: number;
    imageUrl?: string;
    isLiked?: boolean;
    isBookmarked?: boolean;
    commentsDisabled?: boolean;
    isEvent?: boolean;
    eventDate?: string;
    isPoll?: boolean;
    polls?: any[];
    pollOptions?: string[];
    pollVotes?: number[];
    pollVoters?: string[];
    pinned?: boolean;
  };
  onLike?: (postId: string) => void;
  onBookmark?: (postId: string) => void;
  onShare?: (postId: string) => void;
  onReport?: (postId: string) => void;
  onDelete?: (postId: string) => void;
  onEdit?: (postId: string) => void;
  onEditSubmit?: (postId: string, content: string, imageFile?: File | null, eventDate?: string | null, polls?: any[] | null) => void;
  onTogglePin?: (postId: string, nextPinned: boolean) => void;
  onToggleComments?: (postId: string, nextDisabled: boolean) => void;
  onVotePoll?: (postId: string, pollIndex: number, optionIndex: number) => void;
  canDelete?: boolean;
  canEdit?: boolean;
  canComment?: boolean;
  onAddComment?: (postId: string, content: string) => void;
  onLoadMoreComments?: (postId: string, nextCount: number) => void;
  canReact?: boolean;
  canPin?: boolean;
  canDisableComments?: boolean;
  commentsPreview?: { id: string; authorId?: string; authorName?: string; content: string; createdAt?: any }[];
  autoOpenComment?: boolean;
  currentUserId?: string;
  onEditComment?: (postId: string, commentId: string, content: string) => void;
  onDeleteComment?: (postId: string, commentId: string) => void;
  className?: string;
}

const reactionTypes = [
  { id: "like", icon: ThumbsUp, label: "Like", color: "text-blue-500" },
  { id: "insight", icon: Lightbulb, label: "Insightful", color: "text-yellow-500" },
  { id: "love", icon: Heart, label: "Love", color: "text-red-500" },
];

export function EnhancedPostCard({
  post,
  onLike,
  onBookmark,
  onShare,
  onReport,
  onDelete,
  onEdit,
  onEditSubmit,
  onTogglePin,
  onToggleComments,
  onVotePoll,
  canDelete,
  canEdit,
  canComment,
  onAddComment,
  onLoadMoreComments,
  canReact = true,
  canPin = false,
  canDisableComments = false,
  commentsPreview,
  autoOpenComment = false,
  currentUserId,
  onEditComment,
  onDeleteComment,
  className,
}: EnhancedPostCardProps) {
  const [reactions, setReactions] = useState({
    like: post.likes,
    insight: Math.floor(post.likes * 0.3),
    love: Math.floor(post.likes * 0.2),
  });
  const [userReactions, setUserReactions] = useState({
    like: post.isLiked || false,
    insight: false,
    love: false,
    bookmark: post.isBookmarked || false,
  });
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(post.content);
  const [editEditorKey, setEditEditorKey] = useState(0);
  const [editImageFile, setEditImageFile] = useState<File | null>(null);
  const [editImagePreview, setEditImagePreview] = useState<string>("");
  const [editIsEvent, setEditIsEvent] = useState(post.isEvent || false);
  const [editEventDate, setEditEventDate] = useState("");
  const [editEventTime, setEditEventTime] = useState("");
  const [editPolls, setEditPolls] = useState<any[]>(post.polls || []);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [showComment, setShowComment] = useState(!!autoOpenComment);
  const [commentValue, setCommentValue] = useState("");
  const commentRef = useRef<HTMLTextAreaElement | null>(null);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentValue, setEditingCommentValue] = useState<string>("");
  const [deleteCommentId, setDeleteCommentId] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [needsTruncation, setNeedsTruncation] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    setShowComment(!!autoOpenComment);
  }, [autoOpenComment]);

  // Sync bookmark state with prop
  useEffect(() => {
    setUserReactions(prev => ({ ...prev, bookmark: post.isBookmarked || false }));
  }, [post.isBookmarked]);

  // Check if content needs truncation (more than 10 lines)
  useEffect(() => {
    if (contentRef.current && !isExpanded) {
      const lineHeight = parseFloat(getComputedStyle(contentRef.current).lineHeight);
      const maxHeight = lineHeight * 10; // 10 lines
      setNeedsTruncation(contentRef.current.scrollHeight > maxHeight);
    }
  }, [post.content, isExpanded]);

  const handleReaction = (reactionType: string) => {
    if (reactionType === "like" && !canReact) {
      // delegate to onLike for possible toast, but do not toggle local state
      onLike?.(post.id);
      return;
    }
    setUserReactions(prev => {
      const newReactions = { ...prev };
      const wasActive = newReactions[reactionType as keyof typeof newReactions];
      newReactions[reactionType as keyof typeof newReactions] = !wasActive;
      return newReactions;
    });

    setReactions(prev => ({
      ...prev,
      [reactionType]: prev[reactionType as keyof typeof prev] + (userReactions[reactionType as keyof typeof userReactions] ? -1 : 1)
    }));

    if (reactionType === "like") {
      onLike?.(post.id);
    }
  };

  const getPostUrl = () => {
    if (post.platformSlug) {
      return `${window.location.origin}/platforms/${post.platformSlug}/posts/${post.id}`;
    }
    return window.location.href;
  };

  const handleShare = () => {
    const postUrl = getPostUrl();
    if (navigator.share) {
      navigator.share({
        title: `Post by ${post.authorName}`,
        text: post.content,
        url: postUrl,
      });
    } else {
      navigator.clipboard.writeText(postUrl);
    }
    onShare?.(post.id);
  };

  const handleDownloadPDF = () => {
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 20;
      const maxWidth = pageWidth - (margin * 2);
      let yPosition = margin;

      // Parse HTML content preserving structure
      const parseHTMLContent = (html: string) => {
        const temp = document.createElement("div");
        temp.innerHTML = html;
        return Array.from(temp.childNodes);
      };

      // Helper to check if need new page
      const checkNewPage = (neededSpace: number = 15) => {
        if (yPosition + neededSpace > pageHeight - margin) {
          doc.addPage();
          yPosition = margin;
        }
      };

      // Top navigation - Platform name (center horizontal)
      const platformName = post.platformName || "Platform";
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      const platformNameWidth = doc.getTextWidth(platformName);
      const centerX = pageWidth / 2;
      doc.text(platformName, centerX - (platformNameWidth / 2), yPosition);
      yPosition += 12;

      // Header section - author name
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text(post.authorName, margin, yPosition);
      yPosition += 8;

      // Metadata line - date only
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      
      // Format date only (no time)
      const formatDate = (dateValue: any) => {
        let date: Date;
        if (dateValue?.toDate) {
          // Firestore Timestamp
          date = dateValue.toDate();
        } else if (dateValue instanceof Date) {
          date = dateValue;
        } else if (typeof dateValue === 'string') {
          date = new Date(dateValue);
        } else if (typeof dateValue === 'number') {
          date = new Date(dateValue);
        } else {
          date = new Date();
        }
        
        const options: Intl.DateTimeFormatOptions = {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        };
        return date.toLocaleDateString('en-US', options);
      };
      
      const dateOnly = formatDate(post.createdAt);
      doc.text(dateOnly, margin, yPosition);
      yPosition += 12;

      // Add separator line (like card border)
      doc.setLineWidth(0.3);
      doc.line(margin, yPosition, pageWidth - margin, yPosition);
      yPosition += 10;

      // Parse and render HTML content
      const nodes = parseHTMLContent(post.content);
      
      // Helper function to add formatted text inline (keeps track of cursor position)
      let currentX = margin;
      let currentLineY = yPosition;
      
      const addInlineText = (text: string, format: { bold?: boolean; italic?: boolean; underline?: boolean } = {}, fontSize: number = 11) => {
        if (!text) return;
        
        doc.setFontSize(fontSize);
        
        // Determine font style
        let fontStyle = "normal";
        if (format.bold && format.italic) {
          fontStyle = "bolditalic";
        } else if (format.bold) {
          fontStyle = "bold";
        } else if (format.italic) {
          fontStyle = "italic";
        }
        
        doc.setFont("helvetica", fontStyle);
        
        // Split text into words to handle word wrapping
        const words = text.split(' ');
        words.forEach((word, idx) => {
          // Add space before word if not first word
          if (idx > 0) {
            word = ' ' + word;
          }
          
          const wordWidth = doc.getTextWidth(word);
          
          // Check if word would overflow current line
          if (currentX + wordWidth > pageWidth - margin && currentX > margin) {
            // Move to next line
            currentX = margin;
            currentLineY += 6;
            yPosition = currentLineY;
            checkNewPage(6);
          }
          
          // Draw the word
          if (format.underline) {
            doc.text(word, currentX, currentLineY);
            doc.setLineWidth(0.5);
            doc.line(currentX, currentLineY + 1.5, currentX + wordWidth, currentLineY + 1.5);
          } else {
            doc.text(word, currentX, currentLineY);
          }
          
          currentX += wordWidth;
        });
        
        // Reset to normal
        doc.setFont("helvetica", "normal");
      };
      
      // Helper function to start a new line (resets X position)
      const startNewLine = () => {
        currentX = margin;
        currentLineY += 6;
        yPosition = currentLineY;
      };

      // Helper function to extract format from element
      const extractFormat = (el: any): { bold?: boolean; italic?: boolean; underline?: boolean } => {
        const format: { bold?: boolean; italic?: boolean; underline?: boolean } = {};
        const tag = el.tagName?.toLowerCase();
        
        if (tag === 'strong' || tag === 'b' || el.style?.fontWeight === 'bold') {
          format.bold = true;
        }
        if (tag === 'em' || tag === 'i' || el.style?.fontStyle === 'italic') {
          format.italic = true;
        }
        if (tag === 'u' || el.style?.textDecoration === 'underline' || el.classList?.contains('underline')) {
          format.underline = true;
        }
        
        return format;
      };

      nodes.forEach((node: any) => {
        if (node.nodeType === Node.TEXT_NODE) {
          // Text node
          const text = node.textContent?.trim();
          if (text) {
            addInlineText(text, {}, 11);
          }
        } else if (node.nodeType === Node.ELEMENT_NODE) {
          const tagName = node.tagName?.toLowerCase();
          
          if (tagName === 'h1') {
            // H1 - process with inline formatting
            const processH1Element = (el: any, currentFormat: { bold?: boolean; italic?: boolean; underline?: boolean } = {}) => {
              if (el.nodeType === Node.TEXT_NODE) {
                const text = el.textContent || "";
                if (text) {
                  addInlineText(text, currentFormat, 18);
                }
              } else if (el.nodeType === Node.ELEMENT_NODE) {
                const tag = el.tagName?.toLowerCase();
                const newFormat = { ...currentFormat };
                
                if (tag === 'strong' || tag === 'b') {
                  newFormat.bold = true;
                } else if (tag === 'em' || tag === 'i') {
                  newFormat.italic = true;
                } else if (tag === 'u' || el.getAttribute?.('style')?.includes('text-decoration: underline')) {
                  newFormat.underline = true;
                }
                
                Array.from(el.childNodes).forEach((child: any) => processH1Element(child, newFormat));
              }
            };
            
            checkNewPage(15);
            currentLineY = yPosition;
            currentX = margin;
            
            Array.from(node.childNodes).forEach((child: any) => processH1Element(child, { bold: true }));
            
            startNewLine();
            yPosition += 4; // Extra space after H1
          } else if (tagName === 'h2') {
            // H2 - process with inline formatting
            const processH2Element = (el: any, currentFormat: { bold?: boolean; italic?: boolean; underline?: boolean } = {}) => {
              if (el.nodeType === Node.TEXT_NODE) {
                const text = el.textContent || "";
                if (text) {
                  addInlineText(text, currentFormat, 15);
                }
              } else if (el.nodeType === Node.ELEMENT_NODE) {
                const tag = el.tagName?.toLowerCase();
                const newFormat = { ...currentFormat };
                
                if (tag === 'strong' || tag === 'b') {
                  newFormat.bold = true;
                } else if (tag === 'em' || tag === 'i') {
                  newFormat.italic = true;
                } else if (tag === 'u' || el.getAttribute?.('style')?.includes('text-decoration: underline')) {
                  newFormat.underline = true;
                }
                
                Array.from(el.childNodes).forEach((child: any) => processH2Element(child, newFormat));
              }
            };
            
            checkNewPage(12);
            currentLineY = yPosition;
            currentX = margin;
            
            Array.from(node.childNodes).forEach((child: any) => processH2Element(child, { bold: true }));
            
            startNewLine();
            yPosition += 3; // Extra space after H2
          } else if (tagName === 'h3') {
            // H3 - process with inline formatting
            const processH3Element = (el: any, currentFormat: { bold?: boolean; italic?: boolean; underline?: boolean } = {}) => {
              if (el.nodeType === Node.TEXT_NODE) {
                const text = el.textContent || "";
                if (text) {
                  addInlineText(text, currentFormat, 13);
                }
              } else if (el.nodeType === Node.ELEMENT_NODE) {
                const tag = el.tagName?.toLowerCase();
                const newFormat = { ...currentFormat };
                
                if (tag === 'strong' || tag === 'b') {
                  newFormat.bold = true;
                } else if (tag === 'em' || tag === 'i') {
                  newFormat.italic = true;
                } else if (tag === 'u' || el.getAttribute?.('style')?.includes('text-decoration: underline')) {
                  newFormat.underline = true;
                }
                
                Array.from(el.childNodes).forEach((child: any) => processH3Element(child, newFormat));
              }
            };
            
            checkNewPage(10);
            currentLineY = yPosition;
            currentX = margin;
            
            Array.from(node.childNodes).forEach((child: any) => processH3Element(child, { bold: true }));
            
            startNewLine();
            yPosition += 2;
          } else if (tagName === 'p') {
            // Paragraph - handle nested elements with inline formatting
            const processElement = (el: any, currentFormat: { bold?: boolean; italic?: boolean; underline?: boolean } = {}) => {
              if (el.nodeType === Node.TEXT_NODE) {
                const text = el.textContent || "";
                if (text) {
                  addInlineText(text, currentFormat, 11);
                }
              } else if (el.nodeType === Node.ELEMENT_NODE) {
                const tag = el.tagName?.toLowerCase();
                const newFormat = { ...currentFormat };
                
                if (tag === 'strong' || tag === 'b') {
                  newFormat.bold = true;
                } else if (tag === 'em' || tag === 'i') {
                  newFormat.italic = true;
                } else if (tag === 'u' || (el.getAttribute?.('style')?.includes('text-decoration: underline') || el.classList?.contains('underline'))) {
                  newFormat.underline = true;
                }
                
                // Process child nodes with updated format
                Array.from(el.childNodes).forEach((child: any) => processElement(child, newFormat));
              }
            };
            
            // Initialize position for this paragraph
            checkNewPage(8);
            currentLineY = yPosition;
            currentX = margin;
            
            Array.from(node.childNodes).forEach((child: any) => processElement(child));
            
            // Move to next line after paragraph
            startNewLine();
            yPosition += 3; // Space after paragraph
          } else if (tagName === 'br') {
            // Line break
            yPosition += 4;
          } else if (tagName === 'ul' || tagName === 'ol') {
            // List - process each item with inline formatting
            const items = node.querySelectorAll('li') || [];
            items.forEach((item: any, index: number) => {
              const prefix = tagName === 'ol' ? `${index + 1}. ` : '• ';
              
              // Process list item with nested formatting - similar to paragraph
              const processListItemElement = (el: any, currentFormat: { bold?: boolean; italic?: boolean; underline?: boolean } = {}) => {
                if (el.nodeType === Node.TEXT_NODE) {
                  const text = el.textContent || "";
                  if (text) {
                    addInlineText(text, currentFormat, 11);
                  }
                } else if (el.nodeType === Node.ELEMENT_NODE) {
                  const tag = el.tagName?.toLowerCase();
                  const newFormat = { ...currentFormat };
                  
                  if (tag === 'strong' || tag === 'b') {
                    newFormat.bold = true;
                  } else if (tag === 'em' || tag === 'i') {
                    newFormat.italic = true;
                  } else if (tag === 'u' || el.getAttribute?.('style')?.includes('text-decoration: underline') || el.classList?.contains('underline')) {
                    newFormat.underline = true;
                  }
                  
                  Array.from(el.childNodes).forEach((child: any) => processListItemElement(child, newFormat));
                }
              };
              
              // Add prefix and process item content
              addInlineText(prefix, {}, 11);
              
              // Process all child nodes
              if (item.childNodes.length > 0) {
                Array.from(item.childNodes).forEach((child: any) => processListItemElement(child, {}));
              }
              
              // Move to next line after item
              startNewLine();
            });
            yPosition += 3;
          } else if (tagName === 'li') {
            // List item (if not inside ul/ol) - process with formatting
            const format = extractFormat(node);
            addInlineText('• ' + (node.textContent || ""), format, 11);
            yPosition += 2;
          } else if (tagName === 'span' || tagName === 'div') {
            // Span/Div - process nested formatting
            const format = extractFormat(node);
            const processSpanElement = (el: any, currentFormat: { bold?: boolean; italic?: boolean; underline?: boolean } = {}) => {
              const combinedFormat = { ...currentFormat, ...format };
              if (el.nodeType === Node.TEXT_NODE) {
                const text = el.textContent?.trim();
                if (text) {
                  addInlineText(text, combinedFormat, 11);
                }
              } else if (el.nodeType === Node.ELEMENT_NODE) {
                const tag = el.tagName?.toLowerCase();
                const newFormat = { ...combinedFormat };
                
                if (tag === 'strong' || tag === 'b') {
                  newFormat.bold = true;
                } else if (tag === 'em' || tag === 'i') {
                  newFormat.italic = true;
                } else if (tag === 'u') {
                  newFormat.underline = true;
                }
                
                Array.from(el.childNodes).forEach((child: any) => processSpanElement(child, newFormat));
              }
            };
            
            Array.from(node.childNodes).forEach((child: any) => processSpanElement(child));
          } else {
            // Other elements - process with formatting
            const format = extractFormat(node);
            const text = node.textContent?.trim();
            if (text) {
              addInlineText(text, format, 11);
            }
          }
        }
      });

      // Add image if exists
      if (post.imageUrl) {
        yPosition += 8;
        checkNewPage(15);
        doc.setFontSize(10);
        doc.setFont("helvetica", "italic");
        doc.text("[Image attached]", margin, yPosition);
        yPosition += 8;
      }

      // Footer separator removed - no stats displayed

      // Get first line of post content for filename
      const getFirstLine = (html: string): string => {
        if (!html) return "";
        const temp = document.createElement("div");
        temp.innerHTML = html;
        const text = temp.textContent || temp.innerText || "";
        const firstLine = text.split('\n')[0].trim() || text.trim().substring(0, 50);
        // Sanitize filename: remove invalid characters
        return firstLine
          .replace(/[<>:"/\\|?*]/g, '') // Remove invalid filename characters
          .replace(/\s+/g, '-') // Replace spaces with hyphens
          .substring(0, 50) // Limit length
          || `post-${post.id}`;
      };
      
      const firstLine = getFirstLine(post.content);
      const fileName = `${firstLine || `post-${post.id}`}.pdf`;
      doc.save(fileName);
    } catch (error) {
      console.error("Error generating PDF:", error);
      alert("Failed to generate PDF. Please try again.");
    }
  };

  const handleBookmark = () => {
    setUserReactions(prev => ({ ...prev, bookmark: !prev.bookmark }));
    onBookmark?.(post.id);
  };

  const parseContent = (content: string) => {
    // Truncate long URLs for display
    const truncateUrl = (url: string, maxLength: number = 50) => {
      if (url.length <= maxLength) return url;
      return url.substring(0, maxLength) + '...';
    };

    // Simple parsing for hashtags, mentions, community links, and URLs
    return content
      .replace(/#(\w+)/g, '<span class="text-primary font-medium">#$1</span>')
      .replace(/@(\w+)/g, '<span class="text-primary font-medium">@$1</span>')
      .replace(/(https?:\/\/[^\s<>"{}|\\^`[\]]+)/gi, (url) => {
        const truncated = truncateUrl(url);
        return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="text-blue-600 underline break-all">${truncated}</a>`;
      })
      .replace(/\n/g, '<br>');
  };

  // Extract URLs from content
  const extractUrls = (content: string) => {
    const urlRegex = /(https?:\/\/[^\s<>"{}|\\^`[\]]+)/gi;
    const matches = content.match(urlRegex);
    return matches || [];
  };

  const urls = extractUrls(post.content);
  const totalReactions = Object.values(reactions).reduce((sum, count) => sum + count, 0);

  return (
    <Card className={cn(
      "group hover:shadow-md transition-all duration-200 border-border/50",
      className
    )}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10 ring-2 ring-primary/20">
              <AvatarImage src={post.authorAvatar} alt={post.authorName} />
              <AvatarFallback>{post.authorName.substring(0, 2)}</AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-sm font-semibold leading-6">{post.authorName}</CardTitle>
              <CardDescription className="flex items-center gap-2 mt-0.5">
                <Link href={`/communities/${post.communityId}`}>
                  <Badge variant="secondary" className="hover:bg-secondary/80 cursor-pointer transition-colors rounded-full px-2 py-0">
                    {post.communityName}
                  </Badge>
                </Link>
                {post.pinned && (
                  <Badge variant="outline" className="rounded-full px-2 py-0">Pinned</Badge>
                )}
                {post.platformSlug ? (
                  <Link href={`/platforms/${post.platformSlug}/posts/${post.id}`}>
                    <span className="text-xs text-muted-foreground hover:underline">
                      {formatRelativeTime(post.createdAt)}
                    </span>
                  </Link>
                ) : (
                  <span className="text-xs text-muted-foreground">
                    {formatRelativeTime(post.createdAt)}
                  </span>
                )}
              </CardDescription>
            </div>
          </div>
          
          {/* Quick actions menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity rounded-full">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              { canEdit && (
                <DropdownMenuItem onClick={() => { 
                  setEditValue(post.content); 
                  setEditIsEvent(post.isEvent || false);
                  if (post.eventDate) {
                    const date = new Date(post.eventDate);
                    setEditEventDate(date.toISOString().split('T')[0]);
                    setEditEventTime(date.toTimeString().slice(0, 5));
                  } else {
                    setEditEventDate("");
                    setEditEventTime("");
                  }
                  if (post.polls) {
                    setEditPolls(post.polls);
                  } else {
                    setEditPolls([]);
                  }
                  setEditing(true); 
                  setEditEditorKey(prev => prev + 1);
                }}>
                  <Pencil className="h-4 w-4 mr-2" />
                  Edit
                </DropdownMenuItem>
              )}
              { canPin && (
                <DropdownMenuItem onClick={() => onTogglePin?.(post.id, !post.pinned)}>
                  {post.pinned ? <PinOff className="h-4 w-4 mr-2" /> : <Pin className="h-4 w-4 mr-2" />}
                  {post.pinned ? "Unpin from top" : "Pin to top"}
                </DropdownMenuItem>
              )}
              { canDisableComments && (
                <DropdownMenuItem onClick={() => onToggleComments?.(post.id, !post.commentsDisabled)}>
                  <MessageSquareX className="h-4 w-4 mr-2" />
                  {post.commentsDisabled ? "Enable comments" : "Disable comments"}
                </DropdownMenuItem>
              )}
              { canDelete && (
                <DropdownMenuItem className="text-destructive" onClick={() => onDelete?.(post.id)}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              )}
              { canEdit && (
                <DropdownMenuItem onClick={handleDownloadPDF}>
                  <Download className="h-4 w-4 mr-2" />
                  Download as PDF
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={() => onBookmark?.(post.id)}>
                <Bookmark className="h-4 w-4 mr-2" />
                {post.isBookmarked ? "Remove bookmark" : "Bookmark"}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleShare}>
                <Share2 className="h-4 w-4 mr-2" />
                Share
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigator.clipboard.writeText(getPostUrl())}>
                <LinkIcon className="h-4 w-4 mr-2" />
                Copy link
              </DropdownMenuItem>
              {/* Report removed by request */}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {editing ? (
          <div className="space-y-3">
            <KtdLexicalEditor
              key={editEditorKey}
              initialHTML={post.content}
              onChangeHTML={(html) => setEditValue(html)}
              className="w-full"
            />
            <div className="flex items-center gap-2">
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={(e)=>{ const f = e.target.files?.[0] || null; setEditImageFile(f); setEditImagePreview(f ? URL.createObjectURL(f) : ""); }} />
              <Button variant="outline" size="sm" onClick={()=> fileInputRef.current?.click()}>{editImageFile ? "Change image" : (post.imageUrl ? "Replace image" : "Attach image")}</Button>
              <Button 
                variant={editIsEvent ? "default" : "outline"} 
                size="sm" 
                onClick={() => {
                  setEditIsEvent(!editIsEvent);
                  if (!editIsEvent) {
                    setEditPolls([]);
                  }
                }}
              >
                <CalendarCheck className="h-4 w-4 mr-2" />
                {editIsEvent ? "Event" : "Add Event"}
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setEditPolls([...editPolls, { title: "", type: "single", options: ["", ""] }])}
              >
                <BarChart3 className="h-4 w-4 mr-2" />
                Add Question
              </Button>
            </div>
            {editIsEvent && (
              <div className="grid grid-cols-2 gap-3 p-3 bg-primary/5 border rounded-lg">
                <div>
                  <Label htmlFor="edit-event-date" className="text-xs flex items-center gap-1 mb-1">
                    <Calendar className="h-3 w-3" />
                    Date
                  </Label>
                  <Input
                    id="edit-event-date"
                    type="date"
                    value={editEventDate}
                    onChange={(e) => setEditEventDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    className="text-sm"
                  />
                </div>
                <div>
                  <Label htmlFor="edit-event-time" className="text-xs flex items-center gap-1 mb-1">
                    <Clock className="h-3 w-3" />
                    Time
                  </Label>
                  <Input
                    id="edit-event-time"
                    type="time"
                    value={editEventTime}
                    onChange={(e) => setEditEventTime(e.target.value)}
                    className="text-sm"
                  />
                </div>
              </div>
            )}
            {editPolls.length > 0 && (
              <div className="space-y-3">
                {editPolls.map((poll, pollIndex) => (
                  <div key={pollIndex} className="p-3 bg-primary/5 border rounded-lg space-y-3">
                    <div className="flex items-center justify-between">
                      <Input
                        type="text"
                        value={poll.title}
                        onChange={(e) => {
                          const updated = [...editPolls];
                          updated[pollIndex].title = e.target.value;
                          setEditPolls(updated);
                        }}
                        placeholder="Question title..."
                        className="text-sm font-medium"
                      />
                      <div className="flex items-center gap-2">
                        <Button
                          variant={poll.type === "single" ? "default" : "outline"}
                          size="sm"
                          onClick={() => {
                            const updated = [...editPolls];
                            updated[pollIndex].type = "single";
                            setEditPolls(updated);
                          }}
                          className="h-7 text-xs"
                        >
                          <Radio className="h-3 w-3 mr-1" />
                          Single
                        </Button>
                        <Button
                          variant={poll.type === "multiple" ? "default" : "outline"}
                          size="sm"
                          onClick={() => {
                            const updated = [...editPolls];
                            updated[pollIndex].type = "multiple";
                            setEditPolls(updated);
                          }}
                          className="h-7 text-xs"
                        >
                          <CheckSquare className="h-3 w-3 mr-1" />
                          Multiple
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditPolls(editPolls.filter((_: any, i: number) => i !== pollIndex))}
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
                            onChange={(e) => {
                              const updated = [...editPolls];
                              updated[pollIndex].options[optionIndex] = e.target.value;
                              setEditPolls(updated);
                            }}
                            placeholder={`Option ${optionIndex + 1}`}
                            className="text-sm"
                          />
                          {poll.options.length > 2 && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                const updated = [...editPolls];
                                updated[pollIndex].options = updated[pollIndex].options.filter((_: any, i: number) => i !== optionIndex);
                                setEditPolls(updated);
                              }}
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
                      onClick={() => {
                        const updated = [...editPolls];
                        if (updated[pollIndex].options.length < 6) {
                          updated[pollIndex].options.push("");
                          setEditPolls(updated);
                        }
                      }}
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
            {(editImagePreview || post.imageUrl) && (
              <div className="mb-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={editImagePreview || post.imageUrl!} alt="preview" className="max-h-60 max-w-full rounded border object-contain" />
              </div>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={()=>{ 
                setEditing(false); 
                setEditValue(post.content); 
                setEditImageFile(null); 
                setEditImagePreview(""); 
                setEditIsEvent(post.isEvent || false);
                if (post.eventDate) {
                  const date = new Date(post.eventDate);
                  setEditEventDate(date.toISOString().split('T')[0]);
                  setEditEventTime(date.toTimeString().slice(0, 5));
                } else {
                  setEditEventDate("");
                  setEditEventTime("");
                }
                if (post.polls) {
                  setEditPolls(post.polls);
                } else {
                  setEditPolls([]);
                }
                setEditEditorKey(prev => prev + 1);
              }}>Cancel</Button>
              <Button size="sm" onClick={()=>{ 
                const combinedEventDateTime = editIsEvent && editEventDate && editEventTime 
                  ? `${editEventDate}T${editEventTime}` 
                  : null;
                const validPolls = editPolls.length > 0 ? editPolls.filter(p => p.title && p.options && p.options.some((opt: string) => opt.trim())) : null;
                onEditSubmit?.(post.id, editValue.trim(), editImageFile, combinedEventDateTime, validPolls); 
                setEditing(false); 
              }}>Save</Button>
            </div>
          </div>
        ) : (
          <>
            {post.imageUrl ? (
              <div className="mb-3 flex justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={post.imageUrl} alt="post image" className="max-h-96 max-w-full rounded-md border shadow-sm object-contain" />
              </div>
            ) : null}
            <div className="relative">
              <div 
                ref={contentRef}
                className={cn(
                  "text-sm leading-7 mb-2 relative",
                  !isExpanded && needsTruncation && "line-clamp-[10]"
                )}
                dangerouslySetInnerHTML={{ __html: parseContent(post.content) }}
              />
              {needsTruncation && !isExpanded && (
                <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-background to-transparent pointer-events-none" />
              )}
            </div>
            {needsTruncation && !isExpanded && (
              <button
                onClick={() => setIsExpanded(true)}
                className="text-primary hover:text-primary/80 text-sm font-medium -mt-8 mb-2 cursor-pointer"
              >
                See more
              </button>
            )}
            {needsTruncation && isExpanded && (
              <button
                onClick={() => setIsExpanded(false)}
                className="text-primary hover:text-primary/80 text-sm font-medium mb-2 cursor-pointer"
              >
                See less
              </button>
            )}
            {/* URL Previews */}
            {urls.length > 0 && urls.map((url, idx) => (
              <URLPreview key={idx} url={url} />
            ))}
            {/* Event Countdown */}
            {post.isEvent && post.eventDate && (
              <EventCountdown eventDate={post.eventDate} primaryColor={post.platformPrimaryColor} />
            )}
            {/* Poll Display */}
            {post.isPoll && post.polls && (
              <PollsDisplay 
                polls={post.polls}
                userId={currentUserId}
                primaryColor={post.platformPrimaryColor}
                onVote={(pollIndex, optionIndex) => onVotePoll?.(post.id, pollIndex, optionIndex)}
              />
            )}
          </>
        )}

        {/* Reactions bar */}
        <div className="flex items-center justify-between py-2 border-t mt-2">
          <div className="flex items-center gap-4">
            {/* Comments and shares */}
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span>{post.comments} comments</span>
            </div>
          </div>

          {/* Total reactions indicator */}
          {totalReactions > 0 && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <div className="flex -space-x-1">
                {reactionTypes.slice(0, 3).map((reaction, index) => {
                  const Icon = reaction.icon;
                  return (
                    <div
                      key={reaction.id}
                      className="h-4 w-4 rounded-full bg-muted flex items-center justify-center text-xs"
                      style={{ zIndex: 3 - index }}
                    >
                      <Icon className="h-2 w-2" />
                    </div>
                  );
                })}
              </div>
              <span>{totalReactions}</span>
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleReaction("like")}
            className={cn(
              "h-8 text-xs rounded-full px-3",
              userReactions.like && "text-blue-500 border-blue-300"
            )}
          >
            <ThumbsUp className={cn("h-3.5 w-3.5 mr-2", userReactions.like && "fill-current")} />
            Like
          </Button>
          {!post.commentsDisabled && (
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs rounded-full px-3"
              onClick={() => {
                if (!canComment) return;
                setShowComment(true);
                setTimeout(() => commentRef.current?.focus(), 0);
              }}
            >
              <MessageCircle className="h-3.5 w-3.5 mr-2" />
              Comment
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={handleShare}
            className="h-8 text-xs rounded-full px-3"
          >
            <Share2 className="h-3.5 w-3.5 mr-2" />
            Share
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleBookmark}
            className={cn(
              "h-8 w-8 p-0 rounded-full",
              userReactions.bookmark && "text-primary"
            )}
          >
            <Bookmark className={cn("h-4 w-4", userReactions.bookmark && "fill-current")} />
          </Button>
          {canEdit && !editing && (
            <Button variant="outline" size="sm" className="h-8 text-xs rounded-full px-3" onClick={()=> {
              setEditing(true);
              setEditIsEvent(post.isEvent || false);
              if (post.eventDate) {
                const date = new Date(post.eventDate);
                setEditEventDate(date.toISOString().split('T')[0]);
                setEditEventTime(date.toTimeString().slice(0, 5));
              }
              if (post.polls) {
                setEditPolls(post.polls);
              } else {
                setEditPolls([]);
              }
            }}>
              <Pencil className="h-3.5 w-3.5 mr-2" />
              Edit
            </Button>
          )}
        </div>

        {!post.commentsDisabled && Array.isArray(commentsPreview) && commentsPreview.length > 0 && (
          <div className="mt-3 space-y-2">
            {[...commentsPreview].sort((a,b)=>{
              const am = (a.createdAt && typeof (a.createdAt as any).toMillis === "function") ? (a.createdAt as any).toMillis() : new Date((a as any).createdAt || 0).getTime();
              const bm = (b.createdAt && typeof (b.createdAt as any).toMillis === "function") ? (b.createdAt as any).toMillis() : new Date((b as any).createdAt || 0).getTime();
              return am - bm; // oldest first
            }).map((c) => {
              const text = (c.content || "");
              const short = text.length > 200 ? text.slice(0, 200) + "…" : text;
              return (
                <div key={c.id} className="text-xs rounded bg-muted/50 px-3 py-2 border">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{c.authorName || "User"}</span>
                    <span className="text-[10px] text-muted-foreground">{formatRelativeTime((c as any).createdAt || new Date())}</span>
                    {c.authorId && currentUserId && c.authorId === currentUserId && !editingCommentId && (
                      <span className="ml-auto">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                              <MoreHorizontal className="h-3 w-3" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={()=>{
                              setEditingCommentId(c.id);
                              setEditingCommentValue(c.content || "");
                            }}>
                              <Pencil className="h-3 w-3 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive" onClick={()=> setDeleteCommentId(c.id)}>
                              <Trash2 className="h-3 w-3 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </span>
                    )}
                    {editingCommentId === c.id && (
                      <span className="ml-auto flex items-center gap-1">
                        <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px]" onClick={()=>{
                          setEditingCommentId(null);
                          setEditingCommentValue("");
                        }}>Cancel</Button>
                        <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px]" disabled={!editingCommentValue.trim()} onClick={()=>{
                          const next = editingCommentValue.trim();
                          if (next && next !== c.content) onEditComment?.(post.id, c.id, next);
                          setEditingCommentId(null);
                          setEditingCommentValue("");
                        }}>Save</Button>
                      </span>
                    )}
                  </div>
                  {editingCommentId === c.id ? (
                    <div className="mt-2">
                      <Textarea rows={2} value={editingCommentValue} onChange={(e)=> setEditingCommentValue(e.target.value)} />
                    </div>
                  ) : (
                    <div className="text-muted-foreground mt-0.5">{short}</div>
                  )}
                </div>
              );
            })}
            {typeof post.comments === 'number' && (commentsPreview?.length || 0) < (post.comments || 0) && (
              <div>
                <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={()=> onLoadMoreComments?.(post.id, (commentsPreview?.length || 0) + 3)}>
                  Show comments
                </Button>
              </div>
            )}
          </div>
        )}

        {!post.commentsDisabled && canComment && (
          <div className="mt-2">
            {showComment ? (
              <div className="w-full space-y-2">
                <Textarea ref={commentRef} rows={3} value={commentValue} onChange={(e)=> setCommentValue(e.target.value)} placeholder="Write a comment..." />
                <div className="flex justify-end gap-2">
                  <Button variant="outline" size="sm" onClick={()=>{ setShowComment(false); setCommentValue(""); }}>Cancel</Button>
                  <Button size="sm" disabled={!commentValue.trim()} onClick={()=>{ onAddComment?.(post.id, commentValue.trim()); setCommentValue(""); setShowComment(false); }}>Post</Button>
                </div>
              </div>
            ) : (
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={()=> setShowComment(true)}>Write a comment</Button>
            )}
          </div>
        )}

        <Dialog open={deleteCommentId !== null} onOpenChange={(open) => !open && setDeleteCommentId(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete comment</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete this comment? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteCommentId(null)}>Cancel</Button>
              <Button variant="destructive" onClick={() => {
                if (deleteCommentId) {
                  onDeleteComment?.(post.id, deleteCommentId);
                  setDeleteCommentId(null);
                }
              }}>Delete</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
