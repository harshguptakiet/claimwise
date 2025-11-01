import React from "react";

interface LoaderProps {
  text?: string;
  size?: "sm" | "md" | "lg";
}

export const Loader: React.FC<LoaderProps> = ({
  text = "Loading...",
  size = "md",
}) => {
  const sizeClasses = {
    sm: "h-8 w-8 border-2",
    md: "h-16 w-16 border-4",
    lg: "h-20 w-20 border-4",
  };

  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-black/70 z-50 backdrop-blur-sm">
      <div
        className={`animate-spin rounded-full border-t-4 border-t-purple-500 border-purple-500/20 mb-4 ${sizeClasses[size]}`}
      ></div>
      {text && <p className="text-white text-lg font-medium">{text}</p>}
    </div>
  );
};

export default Loader;
