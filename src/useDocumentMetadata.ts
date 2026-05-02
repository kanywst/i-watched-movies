import { useEffect } from 'react';

export function useDocumentMetadata(title: string, faviconUrl: string): void {
  useEffect(() => {
    document.title = title;

    let link = document.querySelector("link[rel*='icon']") as HTMLLinkElement | null;
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
    }
    link.href = faviconUrl;
  }, [title, faviconUrl]);
}
