// The palette belongs to the game, never to its position in a result list.
export function gameArtworkVariant(gameId: string): number {
  let hash = 0;
  for (const character of gameId) {
    hash = (Math.imul(hash, 31) + character.charCodeAt(0)) >>> 0;
  }
  return hash % 4;
}
