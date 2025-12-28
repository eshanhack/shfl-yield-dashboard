"use client";

import { ReactNode } from "react";
import { Inbox, RefreshCw, Search, AlertCircle } from "lucide-react";

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  variant?: "default" | "search" | "error";
}

const ICONS = {
  default: Inbox,
  search: Search,
  error: AlertCircle,
};

export default function EmptyState({ 
  icon, 
  title, 
  description, 
  action,
  variant = "default" 
}: EmptyStateProps) {
  const DefaultIcon = ICONS[variant];
  
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="p-4 rounded-full bg-terminal-accent/10 border border-terminal-accent/20 mb-4">
        {icon || <DefaultIcon className="w-8 h-8 text-terminal-accent" />}
      </div>
      <h3 className="text-lg font-medium text-terminal-text mb-2">
        {title}
      </h3>
      <p className="text-sm text-terminal-textMuted max-w-md mb-4">
        {description}
      </p>
      {action && (
        <button
          onClick={action.onClick}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg 
                     bg-terminal-accent/10 border border-terminal-accent/30 
                     text-terminal-accent text-sm font-medium
                     hover:bg-terminal-accent/20 hover:border-terminal-accent
                     transition-all duration-200 
                     focus:outline-none focus:ring-2 focus:ring-terminal-accent/50"
        >
          <RefreshCw className="w-4 h-4" />
          {action.label}
        </button>
      )}
    </div>
  );
}

