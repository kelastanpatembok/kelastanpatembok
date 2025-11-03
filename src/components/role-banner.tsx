"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Tooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger 
} from "@/components/ui/tooltip";
import { 
  Crown, 
  Users, 
  GraduationCap, 
  Eye,
  X
} from "lucide-react";
import { cn } from "@/lib/utils";

interface RoleBannerProps {
  role: "owner" | "member" | "mentor" | "visitor";
  onDismiss?: () => void;
  className?: string;
}

const roleConfig = {
  owner: {
    label: "Owner",
    icon: Crown,
    color: "bg-purple-100 text-purple-800 border-purple-200",
    description: "Full access to all features, can create communities and manage content",
    capabilities: ["Create communities", "Manage content", "Access all courses", "Mentor others"]
  },
  member: {
    label: "Member",
    icon: Users,
    color: "bg-blue-100 text-blue-800 border-blue-200",
    description: "Can join communities, take courses, and participate in discussions",
    capabilities: ["Join communities", "Take courses", "Post content", "Participate in discussions"]
  },
  mentor: {
    label: "Mentor",
    icon: GraduationCap,
    color: "bg-green-100 text-green-800 border-green-200",
    description: "Can mentor others, review content, and access advanced features",
    capabilities: ["Mentor others", "Review content", "Access all courses", "Advanced features"]
  },
  visitor: {
    label: "Visitor",
    icon: Eye,
    color: "bg-gray-100 text-gray-800 border-gray-200",
    description: "Limited access, can browse content but needs to join for full features",
    capabilities: ["Browse content", "View courses", "Read success stories"]
  }
};

export function RoleBanner({ role, onDismiss, className }: RoleBannerProps) {
  const config = roleConfig[role];
  const Icon = config.icon;

  return (
    <div className={cn(
      "flex items-center gap-3 p-3 rounded-lg border",
      config.color,
      className
    )}>
      <Icon className="h-5 w-5" />
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm">{config.label}</span>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                  <span className="text-xs">i</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-xs">
                <div className="space-y-2">
                  <p className="font-medium">{config.description}</p>
                  <div>
                    <p className="text-xs font-medium mb-1">Capabilities:</p>
                    <ul className="text-xs space-y-1">
                      {config.capabilities.map((capability, index) => (
                        <li key={index} className="flex items-center gap-1">
                          <span className="w-1 h-1 rounded-full bg-current" />
                          {capability}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
      {onDismiss && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onDismiss}
          className="h-6 w-6 p-0 hover:bg-black/10"
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
