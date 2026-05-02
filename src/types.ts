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

export type SortKey =
  | 'watch_date_desc'
  | 'watch_date_asc'
  | 'release_date_desc'
  | 'release_date_asc'
  | 'point_desc'
  | 'point_asc';
