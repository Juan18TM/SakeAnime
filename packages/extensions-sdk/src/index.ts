export interface DetailView {
  title: string;
  poster: string;
  description: string;
  status: string;
  [key: string]: any;
}

export interface Entry {
  id: string;
  title: string;
  poster: string;
  url: string;
}

export interface StreamSource {
  quality: string;
  url: string;
}

export interface ChapterPage {
  page: number;
  url: string;
}

export interface SourceProvider {
  id: string;
  name: string;
  version: string;
  language: string;
  type: "anime" | "manga";

  latest(page: number): Promise<Entry[]>;
  search(query: string, page: number): Promise<Entry[]>;
  detail(url: string): Promise<DetailView>;
}

export interface AnimeProvider extends SourceProvider {
  type: "anime";
  episodes(url: string): Promise<any>;
  watch(url: string): Promise<StreamSource[]>;
}

export interface MangaProvider extends SourceProvider {
  type: "manga";
  chapters(url: string): Promise<any>;
  pages(url: string): Promise<ChapterPage[]>;
}

export interface ExtensionMetadata {
  id: string;
  name: string;
  version: string;
  author: string;
  icon: string;
  type: "anime" | "manga";
  downloadUrl: string;
  language: string;
}

export interface RepositoryData {
  name: string;
  extensions: ExtensionMetadata[];
}
