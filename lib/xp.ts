const BASE_XP = 100;
const EXPONENT = 1.5;

export const calculateLevel = (points: number) => {
  if (points < 0) return 1;
  // Level calculation based on formula: XP = BASE_XP * (level - 1)^1.5
  return Math.floor(Math.pow(points / BASE_XP, 1 / EXPONENT)) + 1;
};

export const getXpRequirementForLevel = (level: number) => {
  return Math.floor(BASE_XP * Math.pow(level - 1, EXPONENT));
};

export const calculateRank = (level: number) => {
  if (level <= 10) return 'E';
  if (level <= 20) return 'D';
  if (level <= 35) return 'C';
  if (level <= 50) return 'B';
  if (level <= 70) return 'A';
  return 'S';
};

// Calculate progress within current level (0.0 - 1.0)
export const calculateLevelProgress = (points: number) => {
  if (points < 0) return 0;
  const currentLevel = calculateLevel(points);
  const currentLevelBaseXp = getXpRequirementForLevel(currentLevel);
  const nextLevelBaseXp = getXpRequirementForLevel(currentLevel + 1);
  
  const xpIntoCurrentLevel = points - currentLevelBaseXp;
  const xpNeededForNextLevel = nextLevelBaseXp - currentLevelBaseXp;
  
  return Math.max(0, Math.min(1, xpIntoCurrentLevel / xpNeededForNextLevel));
};
