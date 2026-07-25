import React from 'react';
import { clsx } from 'clsx';
import { Movie } from '../types';
import { STREAMING_SERVICES, justWatchSearchUrl, type StreamingService } from '../constants';

interface StreamingBadgesProps {
  movie: Movie;
  // 'card' is the compact row under a poster; 'detail' adds the checked stamp and a
  // JustWatch re-check link in the modal.
  variant?: 'card' | 'detail';
}

// A single solid-brand pill: the service logo painted white via CSS mask (so the SVG's own
// colours never fight the pill and it reads the same in light and dark), or the label as
// white text when no logo is bundled.
const ServicePill: React.FC<{
  svc: StreamingService;
  href: string;
  title: string;
  detail: boolean;
}> = ({ svc, href, title, detail }) => {
  const logoHeight = detail ? 15 : 12;
  const pillClass = clsx(
    'inline-flex items-center rounded-full text-white shadow-sm',
    detail ? 'px-3 py-1.5 transition-transform hover:scale-105' : 'px-2.5 py-1',
  );
  const content = svc.logo ? (
    // brightness(0) invert(1) repaints any logo (black, coloured, gradient) to a flat
    // white silhouette, so a single pill style works for every brand and it survives
    // Vite inlining small SVGs as data URIs (a CSS mask silently fails on those).
    <img
      src={svc.logo}
      alt=""
      aria-hidden="true"
      style={{ height: logoHeight, width: 'auto', filter: 'brightness(0) invert(1)' }}
    />
  ) : (
    <span className={clsx('font-semibold tracking-wide', detail ? 'text-xs' : 'text-[10px]')}>
      {svc.label}
    </span>
  );

  // On a card the badges are a non-interactive visual cue: the whole card is already a
  // role="button" that opens the modal, and nesting links inside it would add stray tab
  // stops and invalid button-in-button ARIA. The live links live in the modal (detail),
  // which is not itself a button.
  if (!detail) {
    return (
      <span className={pillClass} style={{ backgroundColor: svc.brandBg }} title={svc.label}>
        {content}
      </span>
    );
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
      aria-label={`Watch ${title} on ${svc.label}`}
      style={{ backgroundColor: svc.brandBg }}
      className={pillClass}
    >
      {content}
    </a>
  );
};

// Availability badges for a watchlist entry. Renders nothing for watched or seen films
// (where "where can I stream this" is not the question) or when no known service is set,
// mirroring how COUNTRY_FLAGS silently renders no flag for an unmapped country.
export const StreamingBadges: React.FC<StreamingBadgesProps> = ({ movie, variant = 'card' }) => {
  if (movie.published || movie.seen) return null;

  const services = (movie.streaming ?? []).filter((key) => STREAMING_SERVICES[key]);
  if (services.length === 0) return null;

  const detail = variant === 'detail';

  return (
    <div className={clsx('flex flex-wrap items-center', detail ? 'mt-4 gap-2' : 'gap-1.5')}>
      {services.map((key) => {
        const svc = STREAMING_SERVICES[key];
        const href = svc.search ? svc.search(movie.title) : justWatchSearchUrl(movie.title);
        return <ServicePill key={key} svc={svc} href={href} title={movie.title} detail={detail} />;
      })}

      {detail && (
        <span className="inline-flex items-center gap-1.5 text-[11px] text-stone-400 dark:text-stone-500">
          {movie.checked && (
            <>
              <span className="tabular-nums">Checked {movie.checked}</span>
              <span aria-hidden="true">·</span>
            </>
          )}
          <a
            href={justWatchSearchUrl(movie.title)}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="underline decoration-dotted underline-offset-2 hover:text-stone-600 dark:hover:text-stone-300"
          >
            JustWatch で最新を確認
          </a>
        </span>
      )}
    </div>
  );
};
