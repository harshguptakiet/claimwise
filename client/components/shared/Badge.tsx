import React from "react";
import { cn } from "@/lib/utils";

type Variant = "severity" | "status" | "queue" | "default";
type SeverityLevel = "Low" | "Medium" | "High" | "Critical";
type StatusLevel = "Processing" | "Completed" | "Rejected" | "Draft";

interface BadgeProps {
  variant?: Variant;
  severity?: SeverityLevel;
  status?: StatusLevel;
  children: React.ReactNode;
  className?: string;
}

const Badge: React.FC<BadgeProps> = ({
  variant = "default",
  severity,
  status,
  children,
  className,
}) => {
  let styleClasses = "";

  if (variant === "severity" && severity) {
    switch (severity) {
      case "Low":
        styleClasses = "bg-green-500/20 text-green-400 border-green-500/30";
        break;
      case "Medium":
        styleClasses = "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
        break;
      case "High":
        styleClasses = "bg-red-500/20 text-red-400 border-red-500/30";
        break;
      case "Critical":
        styleClasses = "bg-red-600/20 text-red-300 border-red-600/30";
        break;
      default:
        styleClasses = "bg-gray-500/20 text-gray-400 border-gray-500/30";
    }
  } else if (variant === "status" && status) {
    switch (status) {
      case "Processing":
        styleClasses = "bg-blue-500/20 text-blue-400 border-blue-500/30";
        break;
      case "Completed":
        styleClasses = "bg-green-500/20 text-green-400 border-green-500/30";
        break;
      case "Rejected":
        styleClasses = "bg-red-500/20 text-red-400 border-red-500/30";
        break;
      case "Draft":
        styleClasses = "bg-gray-500/20 text-gray-400 border-gray-500/30";
        break;
      default:
        styleClasses = "bg-gray-500/20 text-gray-400 border-gray-500/30";
    }
  } else if (variant === "queue") {
    styleClasses =
      "bg-cyan-500/20 text-cyan-400 border-cyan-500/30 dark:bg-cyan-400/10";
  } else {
    styleClasses = "bg-muted text-muted-foreground border-border";
  }

  return (
    <span
      className={cn(
        "inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border",
        styleClasses,
        className
      )}
    >
      {children}
    </span>
  );
};

export default Badge;
