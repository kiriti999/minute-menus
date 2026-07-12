import type { MenuDishRef } from "./types";

export const normalizeMatchKey = (value: string): string =>
  value
    .replace(/\.[^/.]+$/, "")
    .replace(/[/\\]/g, " ")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const scoreNameMatch = (left: string, right: string): number => {
  if (!left || !right) return 0;
  if (left === right) return 100;
  if (left.includes(right) || right.includes(left)) return 85;

  const leftTokens = new Set(left.split(" ").filter(Boolean));
  const rightTokens = right.split(" ").filter(Boolean);
  if (rightTokens.length === 0) return 0;

  const overlap = rightTokens.filter((token) => leftTokens.has(token)).length;
  return (overlap / rightTokens.length) * 70;
};

export const matchDishIdFromFile = (
  fileName: string,
  relativePath: string,
  dishes: MenuDishRef[],
): string | null => {
  const fileKey = normalizeMatchKey(fileName);
  const folderKey = normalizeMatchKey(relativePath.replace(/[/\\][^/\\]+$/, ""));

  let bestId: string | null = null;
  let bestScore = 0;

  for (const dish of dishes) {
    const dishKey = normalizeMatchKey(dish.name);
    const scores = [scoreNameMatch(fileKey, dishKey)];
    if (folderKey) scores.push(scoreNameMatch(folderKey, normalizeMatchKey(dish.category)));

    const score = Math.max(...scores);
    if (score > bestScore && score >= 50) {
      bestScore = score;
      bestId = dish.id;
    }
  }

  return bestId;
};

export const toImageFileName = (dishName: string): string => `${dishName.trim()}.png`;
