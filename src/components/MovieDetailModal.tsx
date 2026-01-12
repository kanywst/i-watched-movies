import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Calendar, Star, Quote } from 'lucide-react';
import { Movie } from '../types';
import { format } from 'date-fns';

interface MovieDetailModalProps {
  movie: Movie | null;
  onClose: () => void;
}

export const MovieDetailModal: React.FC<MovieDetailModalProps> = ({ movie, onClose }) => {
  // Prevent body scroll when modal is open
  useEffect(() => {
    if (movie) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [movie]);

  return (
    <AnimatePresence>
      {movie && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-stone-950/90 backdrop-blur-sm z-50 flex items-center justify-center p-4 md:p-8"
          >
            {/* Modal Content */}
            <motion.div
              layoutId={`movie-card-${movie.id}`}
              className="bg-stone-900 w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-xl border border-white/5 shadow-2xl relative flex flex-col md:flex-row overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close Button */}
              <button
                onClick={onClose}
                className="absolute top-4 right-4 z-50 p-2 rounded-full bg-black/20 hover:bg-black/40 text-white transition-colors backdrop-blur-md border border-white/10"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Image Section (Top on mobile, Left on desktop) */}
              <div className="w-full md:w-2/5 h-64 md:h-auto relative shrink-0 bg-stone-950">
                <div className="absolute inset-0 overflow-hidden">
                   {/* Blur Background for fill */}
                  <img
                    src={movie.cover_image}
                    alt=""
                    className="w-full h-full object-cover blur-3xl scale-125 opacity-40 grayscale-[0.3]"
                  />
                </div>
                <img
                  src={movie.cover_image}
                  alt={movie.title}
                  className="relative z-10 w-full h-full object-contain md:object-cover p-4 md:p-0"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-stone-900 via-transparent to-transparent md:bg-gradient-to-r md:from-transparent md:to-stone-900 opacity-90 md:opacity-100" />
              </div>

              {/* Info Section */}
              <div className="flex-1 p-8 md:p-12 flex flex-col gap-8 bg-stone-900 relative">
                
                {/* Header Info */}
                <div>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {movie.tags.map((tag) => (
                      <span 
                        key={tag} 
                        className="inline-flex items-center text-xs font-medium px-2.5 py-1 rounded-full bg-stone-800 text-stone-300 border border-stone-700/50"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                  
                  <h2 className="text-3xl md:text-4xl font-bold text-stone-100 leading-tight mb-3">
                    {movie.title}
                  </h2>

                  <div className="flex items-center gap-6 text-sm text-stone-500">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-4 h-4" />
                      <span>Watched: {movie.watch_date ? format(new Date(movie.watch_date), 'MMMM d, yyyy') : 'N/A'}</span>
                    </div>
                    <div className="flex items-center gap-1 text-stone-300 font-medium">
                      <Star className="w-4 h-4 fill-stone-300" />
                      <span>{movie.point}/10</span>
                    </div>
                  </div>
                </div>

                {/* Content Body */}
                <div className="space-y-8 overflow-y-auto pr-2 custom-scrollbar">
                  
                  {/* Summary */}
                  {movie.summary && (
                    <div className="text-stone-400 leading-relaxed text-sm md:text-base border-l-2 border-stone-800 pl-4">
                      {movie.summary}
                    </div>
                  )}

                  {/* Impression */}
                  {movie.impression && (
                    <div className="relative bg-stone-800/50 p-6 rounded-lg border border-stone-800">
                      <Quote className="absolute top-4 left-4 w-6 h-6 text-stone-600 fill-stone-600/20" />
                      <div className="relative z-10 text-lg md:text-xl font-medium text-stone-200 italic leading-relaxed pt-2 pl-4">
                        "{movie.impression}"
                      </div>
                    </div>
                  )}

                  {/* Full Content */}
                  {!movie.summary && !movie.impression && (
                    <div className="prose prose-invert prose-sm max-w-none text-stone-400">
                      {movie.content}
                    </div>
                  )}

                </div>
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
