import { motion, AnimatePresence } from "motion/react";
import { X, ZoomIn, ZoomOut, Download, ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";

interface ImageViewerModalProps {
  isOpen: boolean;
  imageUrl: string | null;
  imageUrls?: string[] | null;
  title?: string;
  onClose: () => void;
}

export function ImageViewerModal({ isOpen, imageUrl, imageUrls, title = "Document Image", onClose }: ImageViewerModalProps) {
  const [zoom, setZoom] = useState(1);
  const images = imageUrls && imageUrls.length > 0 ? imageUrls : (imageUrl ? [imageUrl] : []);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const handleZoom = (direction: "in" | "out") => {
    setZoom((prev) => {
      const newZoom = direction === "in" ? Math.min(prev + 0.2, 3) : Math.max(prev - 0.2, 0.5);
      return Number(newZoom.toFixed(1));
    });
  };

  const handleDownload = () => {
    const currentImageUrl = images[currentImageIndex];
    if (currentImageUrl) {
      const link = document.createElement("a");
      link.href = currentImageUrl;
      link.download = `${title.toLowerCase().replace(/\s+/g, "-")}-${currentImageIndex + 1}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const goToPrevious = () => {
    setCurrentImageIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
    setZoom(1);
  };

  const goToNext = () => {
    setCurrentImageIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
    setZoom(1);
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
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-gray-900 truncate">{title}</h3>
                {images.length > 1 && (
                  <p className="text-xs text-gray-400 mt-1">Image {currentImageIndex + 1} of {images.length}</p>
                )}
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Image Container */}
            <div className="flex-1 flex items-center justify-center bg-gray-50 overflow-auto relative group">
              {images.length > 0 ? (
                <>
                  <AnimatePresence mode="wait">
                    <motion.img
                      key={currentImageIndex}
                      src={images[currentImageIndex]}
                      alt={`${title} ${currentImageIndex + 1}`}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      style={{ scale: zoom }}
                      className="max-w-full max-h-full object-contain"
                      draggable={false}
                    />
                  </AnimatePresence>
                  
                  {/* Carousel Navigation */}
                  {images.length > 1 && (
                    <>
                      <button
                        onClick={goToPrevious}
                        className="absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors opacity-0 group-hover:opacity-100"
                        title="Previous image"
                      >
                        <ChevronLeft className="w-5 h-5" />
                      </button>
                      <button
                        onClick={goToNext}
                        className="absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors opacity-0 group-hover:opacity-100"
                        title="Next image"
                      >
                        <ChevronRight className="w-5 h-5" />
                      </button>
                    </>
                  )}
                </>
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
            {images.length > 0 && (
              <div className="px-6 py-4 border-t border-gray-100 space-y-3">
                {/* Thumbnail indicators for multiple images */}
                {images.length > 1 && (
                  <div className="flex gap-2 overflow-x-auto pb-2">
                    {images.map((url, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          setCurrentImageIndex(idx);
                          setZoom(1);
                        }}
                        className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${
                          idx === currentImageIndex ? "border-blue-500 scale-105" : "border-gray-200 hover:border-gray-300"
                        }`}
                      >
                        <img src={url} alt={`Thumbnail ${idx + 1}`} className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}
                
                {/* Controls */}
                <div className="flex items-center justify-center gap-3">
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
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
