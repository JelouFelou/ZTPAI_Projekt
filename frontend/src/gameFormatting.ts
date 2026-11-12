import type { Game } from "./api";

export const formatPlayers = (game: Game) =>
  game.minPlayers === game.maxPlayers
    ? `${game.minPlayers} os.`
    : `${game.minPlayers}–${game.maxPlayers} os.`;
export const formatDuration = (minutes: number) =>
  minutes >= 60 && minutes % 60 === 0
    ? `${minutes / 60} godz.`
    : `${minutes} min`;
