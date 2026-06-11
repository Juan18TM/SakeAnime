/** Géneros compartidos con mapeo por proveedor */
export type AnimeGenre = {
  id: string;
  label: string;
  tioanime: string;
  animefenix2: number;
};

export const ANIME_GENRES: AnimeGenre[] = [
  { id: 'accion', label: 'Acción', tioanime: 'accion', animefenix2: 1 },
  { id: 'aventuras', label: 'Aventuras', tioanime: 'aventura', animefenix2: 23 },
  { id: 'comedia', label: 'Comedia', tioanime: 'comedia', animefenix2: 5 },
  { id: 'drama', label: 'Drama', tioanime: 'drama', animefenix2: 6 },
  { id: 'romance', label: 'Romance', tioanime: 'romance', animefenix2: 3 },
  { id: 'fantasia', label: 'Fantasía', tioanime: 'fantasia', animefenix2: 13 },
  { id: 'ciencia-ficcion', label: 'Ciencia Ficción', tioanime: 'ciencia-ficcion', animefenix2: 20 },
  { id: 'shounen', label: 'Shounen', tioanime: 'shounen', animefenix2: 9 },
  { id: 'shoujo', label: 'Shoujo', tioanime: 'shoujo', animefenix2: 4 },
  { id: 'seinen', label: 'Seinen', tioanime: 'seinen', animefenix2: 7 },
  { id: 'ecchi', label: 'Ecchi', tioanime: 'ecchi', animefenix2: 11 },
  { id: 'harem', label: 'Harem', tioanime: 'harem', animefenix2: 28 },
  { id: 'isekai', label: 'Isekai', tioanime: 'fantasia', animefenix2: 51 },
  { id: 'deportes', label: 'Deportes', tioanime: 'deportes', animefenix2: 8 },
  { id: 'terror', label: 'Terror', tioanime: 'terror', animefenix2: 27 },
  { id: 'misterio', label: 'Misterio', tioanime: 'misterio', animefenix2: 17 },
  { id: 'psicologico', label: 'Psicológico', tioanime: 'psicologico', animefenix2: 18 },
  { id: 'sobrenatural', label: 'Sobrenatural', tioanime: 'sobrenatural', animefenix2: 12 },
  { id: 'magia', label: 'Magia', tioanime: 'magia', animefenix2: 14 },
  { id: 'mecha', label: 'Mecha', tioanime: 'mecha', animefenix2: 21 },
  { id: 'musica', label: 'Música', tioanime: 'musica', animefenix2: 36 },
  { id: 'historico', label: 'Histórico', tioanime: 'historico', animefenix2: 24 },
  { id: 'escolares', label: 'Escolares', tioanime: 'escolares', animefenix2: 2 },
  { id: 'slice-of-life', label: 'Recuentos de la vida', tioanime: 'josei', animefenix2: 10 },
  { id: 'yaoi', label: 'Yaoi', tioanime: 'yaoi', animefenix2: 40 },
  { id: 'yuri', label: 'Yuri', tioanime: 'yuri', animefenix2: 37 },
];

export function getGenreById(id: string): AnimeGenre | undefined {
  return ANIME_GENRES.find(g => g.id === id);
}
