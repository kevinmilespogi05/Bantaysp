import { motion, AnimatePresence } from "motion/react";
import { X, ZoomIn, ZoomOut, Download } from "lucide-react";
import { useState } from "react";

interface ImageViewerModalProps {
  isOpen: boolean;
  imageUrl: string | null;
  title?: string;
  onClose: () => void;
}

export function ImageViewerModal({ isOpen, imageUrl, title = "Document Image", onClose }: ImageViewerModalProps) {
  const [zoom, setZoom] = useState(1);

  const handleZoom = (direction: "in" | "out") => {
    setZoom((prev) => {
      const newZoom = direction === "in" ? Math.min(prev + 0.2, 3) : Math.max(prev - 0.2, 0.5);
      return Number(newZoom.toFixed(1));
    });
  };

  const handleDownload = () => {
    if (imageUrl) {
      const link = document.createElement("a");
      link.href = imageUrl;
      link.download = `${title.toLowerCase().replace(/\s+/g, "-")}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="relative bg-white rounded-2xl shadow-2xl w-full h-full md:w-[90vw] md:h-[90vh] md:max-w-4xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900">{title}</h3>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Image Container */}
            <div className="flex-1 flex items-center justify-center bg-gray-50 overflow-auto">
              {imageUrl ? (
                <motion.img
                  src={imageUrl}
                  alt={title}
                  style={{ scale: zoom }}
                  className="max-w-full max-h-full object-contain"
                  draggable={false}
                />
              ) : (
                <div className="flex flex-col items-center justify-center text-gray-400">
                  <div className="w-20 h-20 rounded-full bg-gray-200 flex items-center justify-center mb-3">
                    <span className="text-2xl">📄</span>
                  </div>
                  <p className="text-sm">No image available</p>
                </div>
              )}
            </div>

            {/* Controls */}
            {imageUrl && (
              <div className="flex items-center justify-center gap-3 px-6 py-4 border-t border-gray-100">
                <button
                  onClick={() => handleZoom("out")}
                  disabled={zoom <= 0.5}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 text-gray-600 text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  <ZoomOut className="w-4 h-4" />
                  Zoom Out
                </button>

                <div className="px-3 py-2 rounded-lg bg-gray-100 text-gray-600 text-sm font-medium">
                  {Math.round(zoom * 100)}%
                </div>

                <button
                  onClick={() => handleZoom("in")}
                  disabled={zoom >= 3}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 text-gray-600 text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  <ZoomIn className="w-4 h-4" />
                  Zoom In
                </button>

                <div className="w-px h-6 bg-gray-200" />

                <button
                  onClick={handleDownload}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-50 text-blue-600 text-sm hover:bg-blue-100 transition-all"
                >
                  <Download className="w-4 h-4" />
                  Download
                </button>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
