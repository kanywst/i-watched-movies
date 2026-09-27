import React, { useEffect, useState } from 'react';
import { Check, Share2 } from 'lucide-react';
import { moviePageUrl } from '../constants';

const COPIED_MS = 2000;

/**
 * Hands out the entry's own page (m/<id>/), which unfurls as the film, rather than the
 * `?selected=` URL in the address bar, which unfurls as the site. The system share sheet
 * where there is one (phones, mostly), otherwise a copy to the clipboard with a tick to say
 * it happened.
 */
export const ShareButton: React.FC<{ id: string; title: string; className?: string }> = ({
  id,
  title,
  className,
}) => {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), COPIED_MS);
    return () => window.clearTimeout(timer);
  }, [copied]);

  const share = async () => {
    const url = moviePageUrl(id, document.baseURI);
    if (navigator.share) {
      try {
        await navigator.share({ title, url });
        return;
      } catch (err) {
        // The reader closing the sheet is not a failure worth a fallback.
        if (err instanceof DOMException && err.name === 'AbortError') return;
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      // No clipboard (an insecure context, or permission refused): nothing sensible to do.
    }
  };

  return (
    <button type="button" onClick={share} aria-label={copied ? 'Link copied' : `Share ${title}`} className={className}>
      {copied ? <Check className="w-5 h-5" /> : <Share2 className="w-5 h-5" />}
      <span aria-live="polite" className="sr-only">{copied ? 'Link copied' : ''}</span>
    </button>
  );
};
