import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Calendar, Star, Quote, AlignLeft } from 'lucide-react';
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
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 md:p-8"
          >
            {/* Modal Content */}
            <motion.div
              layoutId={`movie-card-${movie.id}`}
              className="bg-dark-card w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-3xl border border-white/10 shadow-2xl relative flex flex-col md:flex-row overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close Button */}
              <button
                onClick={onClose}
                className="absolute top-4 right-4 z-50 p-2 rounded-full bg-black/50 hover:bg-white/20 text-white transition-colors backdrop-blur-md"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Image Section (Top on mobile, Left on desktop) */}
              <div className="w-full md:w-2/5 h-64 md:h-auto relative shrink-0">
                <div className="absolute inset-0 overflow-hidden">
                   {/* Blur Background for fill */}
                  <img
                    src={movie.cover_image}
                    alt=""
                    className="w-full h-full object-cover blur-2xl scale-110 opacity-60"
                  />
                </div>
                <img
                  src={movie.cover_image}
                  alt={movie.title}
                  className="relative z-10 w-full h-full object-contain md:object-cover p-4 md:p-0"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-dark-card via-transparent to-transparent md:bg-gradient-to-r md:from-transparent md:to-dark-card opacity-90 md:opacity-100" />
              </div>

              {/* Info Section */}
              <div className="flex-1 p-6 md:p-10 flex flex-col gap-6 bg-dark-card relative">
                
                {/* Header Info */}
                <div>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {movie.tags.map((tag) => (
                      <span 
                        key={tag} 
                        className="inline-flex items-center text-xs font-semibold px-2.5 py-1 rounded-md bg-purple-500/10 text-purple-300 border border-purple-500/20"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                  
                  <h2 className="text-3xl md:text-4xl font-bold text-white leading-tight mb-2">
                    {movie.title}
                  </h2>

                  <div className="flex items-center gap-4 text-sm text-dark-muted mb-6">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-4 h-4" />
                      <span>Watched: {movie.watch_date ? format(new Date(movie.watch_date), 'MMM d, yyyy') : 'N/A'}</span>
                    </div>
                    <div className="flex items-center gap-1 text-yellow-400 font-medium bg-yellow-400/10 px-2 py-0.5 rounded-full border border-yellow-400/20">
                      <Star className="w-3.5 h-3.5 fill-yellow-400" />
                      <span>{movie.point}</span>
                    </div>
                  </div>
                </div>

                {/* Content Body */}
                <div className="space-y-6 overflow-y-auto pr-2 custom-scrollbar">
                  
                  {/* Summary */}
                  {movie.summary && (
                    <div className="bg-white/5 rounded-2xl p-5 border border-white/5">
                      <div className="flex items-center gap-2 mb-3 text-white/90 font-semibold">
                        <AlignLeft className="w-5 h-5 text-purple-400" />
                        <h3>Summary</h3>
                      </div>
                      <p className="text-dark-muted leading-relaxed text-sm md:text-base">
                        {movie.summary}
                      </p>
                    </div>
                  )}

                  {/* Impression */}
                  {movie.impression && (
                    <div className="relative pl-6 md:pl-8 border-l-4 border-purple-500/50 py-2">
                      <Quote className="absolute top-0 left-0 -translate-x-1/2 -translate-y-1/2 w-8 h-8 text-purple-500/20 fill-purple-500/20" />
                      <div className="text-lg md:text-xl font-medium text-white/90 italic leading-relaxed">
                        "{movie.impression}"
                      </div>
                    </div>
                  )}

                  {/* Full Content (if different/longer) */}
                  {/* We can hide this if summary/impression covers it, or show it as 'Notes' */}
                  {!movie.summary && !movie.impression && (
                    <div className="prose prose-invert prose-sm max-w-none text-dark-muted">
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
