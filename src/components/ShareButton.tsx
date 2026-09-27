import React, { useEffect, useRef, useState } from 'react';
import { Check, Share2 } from 'lucide-react';
import { moviePageUrl } from '../constants';

const COPIED_MS = 2000;

/**
 * Hands out the entry's own page (m/<id>/), which unfurls as the film, rather than the
 * `?selected=` URL in the address bar, which unfurls as the site. The system share sheet
 * where there is one (phones, mostly), otherwise a copy to the clipboard with a tick to say
 * it happened.
 *
 * The clipboard is only the fallback for a browser with no share sheet, not for a share
 * that failed: by the time `navigator.share` rejects, the click's user activation is spent
 * and Safari refuses the clipboard write, and a second click while the sheet is still open
 * rejects with InvalidStateError, where copying behind the open sheet would be wrong too.
 */
export const ShareButton: React.FC<{ id: string; title: string; className?: string }> = ({
  id,
  title,
  className,
}) => {
  const [copied, setCopied] = useState(false);
  const inFlight = useRef(false);

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), COPIED_MS);
    return () => window.clearTimeout(timer);
  }, [copied]);

  const share = async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    const url = moviePageUrl(id, document.baseURI);
    try {
      if (navigator.share) {
        await navigator.share({ title, url });
      } else {
        await navigator.clipboard.writeText(url);
        setCopied(true);
      }
    } catch {
      // Dismissing the sheet rejects with AbortError, and a refused clipboard (an insecure
      // context) has no better fallback here; either way the button just does nothing.
    } finally {
      inFlight.current = false;
    }
  };

  return (
    <button type="button" onClick={share} aria-label={copied ? 'Link copied' : `Share ${title}`} className={className}>
      {copied ? <Check className="w-5 h-5" /> : <Share2 className="w-5 h-5" />}
      <span aria-live="polite" className="sr-only">{copied ? 'Link copied' : ''}</span>
    </button>
  );
};
