export interface Movie {
  id: string;
  title: string;
  published: boolean;
  tags: string[];
  national?: string;
  cover_image: string;
  release_date: string;
  watch_date: string;
  point: number | string;
  content: string;
  summary?: string;
  impression?: string;
}
