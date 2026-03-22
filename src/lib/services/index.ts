export type ServiceId = "movies" | "tv" | "books" | "games";

export interface ExternalResult {
  external_id: string;
  title: string;
  year: string | null;
  genre: string | null;
  poster_path: string | null;
  overview: string | null;
}

export interface ServiceConfig {
  id: ServiceId;
  label: string;
  apiLabel: string;
  searchEndpoint: string;
  placeholder: string;
  posterBase: string;
  posterAspect: "portrait" | "landscape";
}

export const SERVICES: Record<ServiceId, ServiceConfig> = {
  movies: {
    id: "movies",
    label: "Peliculas",
    apiLabel: "TMDB",
    searchEndpoint: "/api/search/movies",
    placeholder: "Buscar pelicula...",
    posterBase: "https://image.tmdb.org/t/p/w92",
    posterAspect: "portrait",
  },
  tv: {
    id: "tv",
    label: "Series",
    apiLabel: "TMDB",
    searchEndpoint: "/api/search/tv",
    placeholder: "Buscar serie...",
    posterBase: "https://image.tmdb.org/t/p/w92",
    posterAspect: "portrait",
  },
  books: {
    id: "books",
    label: "Libros",
    apiLabel: "Google Books",
    searchEndpoint: "/api/search/books",
    placeholder: "Buscar libro...",
    posterBase: "",
    posterAspect: "portrait",
  },
  games: {
    id: "games",
    label: "Videojuegos",
    apiLabel: "RAWG",
    searchEndpoint: "/api/search/games",
    placeholder: "Buscar videojuego...",
    posterBase: "",
    posterAspect: "landscape",
  },
};

export function getService(listType: string | null | undefined): ServiceConfig | null {
  if (!listType || !(listType in SERVICES)) return null;
  return SERVICES[listType as ServiceId];
}

export const LIST_TYPE_OPTIONS: { value: string | null; label: string; emoji: string }[] = [
  { value: null, label: "Sin tipo", emoji: "—" },
  { value: "movies", label: "Peliculas", emoji: "🎬" },
  { value: "tv", label: "Series", emoji: "📺" },
  { value: "books", label: "Libros", emoji: "📚" },
  { value: "games", label: "Videojuegos", emoji: "🎮" },
];

export const TMDB_POSTER_BASE = "https://image.tmdb.org/t/p/w185";
