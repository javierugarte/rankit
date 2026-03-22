export type ServiceId = "movies";

export interface ExternalResult {
  external_id: string;
  title: string;
  year: string | null;
  type: string;
  poster_path: string | null;
  overview: string | null;
}

export interface ServiceConfig {
  id: ServiceId;
  label: string;
  searchEndpoint: string;
  placeholder: string;
  posterBase: string;
}

export const SERVICES: Record<ServiceId, ServiceConfig> = {
  movies: {
    id: "movies",
    label: "Peliculas y Series (TMDB)",
    searchEndpoint: "/api/search/movies",
    placeholder: "Buscar pelicula o serie...",
    posterBase: "https://image.tmdb.org/t/p/w92",
  },
};

export function getService(listType: string | null | undefined): ServiceConfig | null {
  if (!listType || !(listType in SERVICES)) return null;
  return SERVICES[listType as ServiceId];
}

export const LIST_TYPE_OPTIONS: { value: string | null; label: string; emoji: string }[] = [
  { value: null, label: "Sin tipo", emoji: "—" },
  { value: "movies", label: "Peliculas y Series", emoji: "🎬" },
];
