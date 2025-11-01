import React from "react";
import { X, Download } from "lucide-react";

interface PdfViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  filename: string;
  url: string;
}

const PdfViewerModal: React.FC<PdfViewerModalProps> = ({
  isOpen,
  onClose,
  filename,
  url,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
      <div className="bg-card border border-border rounded-lg w-full max-w-4xl h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h3 className="text-lg font-semibold text-foreground">{filename}</h3>
          <div className="flex items-center gap-2">
            <a
              href={url}
              download={filename}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 hover:bg-background rounded-lg transition-colors"
              title="Download PDF"
            >
              <Download className="w-5 h-5 text-primary" />
            </a>
            <button
              onClick={onClose}
              className="p-2 hover:bg-background rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-foreground" />
            </button>
          </div>
        </div>

        {/* PDF Viewer */}
        <div className="flex-1 overflow-hidden">
          <iframe
            src={`${url}#toolbar=1`}
            className="w-full h-full border-none"
            title={filename}
          />
        </div>

        {/* Fallback */}
        <div className="hidden" id="pdf-fallback">
          <p className="text-muted-foreground text-center p-4">
            Unable to display PDF in browser.{" "}
            <a
              href={url}
              download={filename}
              className="text-primary hover:underline"
            >
              Download the file
            </a>{" "}
            to view it.
          </p>
        </div>
      </div>
    </div>
  );
};

export default PdfViewerModal;
