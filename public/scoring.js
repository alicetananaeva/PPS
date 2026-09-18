export const APP_VERSION = "pps-cloudflare-2.0.0";

export const LIKERT_LABELS = [
  "Never",
  "Once in a while",
  "About half the time",
  "Very often",
  "Always",
];

export const ITEM_TEXTS = {
  X32: "I reprimand my pet to improve behavior",
  X30: "I carry out discipline after my pet misbehaves",
  X76: "If I give a command, I believe my pet should obey me because I said so",
  X18: "I scold or criticize my pet's behavior if it doesn't meet my expectations",
  X24: "I employ an \"alpha\" or \"pack leader\" mentality with my pet",
  X39: "When I teach my pet commands I expect him/her to obey me no matter what",
  X38: "I use short, quick pulls on the leash, collar, or scruff if my pet pulls when I'm handling it",
  X4: "I use a stern, loud voice when my pet misbehaves",
  X70: "I use physical aids when I train my pet",
  X48: "I yell or shout when my pet misbehaves",
  X35: "I demand that my pet does things",
  X11: "I tell my pet what to do",
  X52: "I think about my pet's feelings",
  X47: "I spend (or try to spend) a lot of quality time with my pet",
  X33: "I think about my pet when I'm away from home",
  X67: "I have warm and fun times with my dog",
  X65: "I laugh and joke with my pet",
  X78: "I believe my pet displays human emotions",
  X80: "If I make a mistake with my pet, I feel bad and try to make it up to him/her",
  X7: "I wish I could spend more time with my pet",
  X19: "I play with my pet",
  X62: "I celebrate my pet's birthday",
  X43: "I can recognize individuals that my pet gets along with",
  X5: "I show patience with my pet",
  X44: "I ignore my pet when it chews or steals something it's not supposed to",
  X71: "I am unsure about how to handle my pet's misbehavior",
  X13: "I worry about being too harsh when correcting my pet's misbehavior",
  X40: "I give into my dog when he/she causes a commotion about something",
  X14: "I am afraid that disciplining my pet for misbehavior will cause him to like me less",
  X72: "I give into my pet when my pet is stubborn",
  X64: "I think about punishing my pet but don't actually do it",
  X3: "I allow my pet to annoy other animals",
  X61: "I worry about how my pet feels about me, especially whether my pet likes me or not",
  X10: "I worry that I will overly restrict my pet if I am too demanding",
  X34: "If I have guests over and my pet misbehaves, I refrain from correcting it",
  X60: "I spoil my pet",
};

export const ITEM_LIST = Object.keys(ITEM_TEXTS).sort(
  (a, b) => Number(a.slice(1)) - Number(b.slice(1)),
);

const PERMISSIVE_ITEMS = [
  "X3", "X10", "X13", "X14", "X34", "X40", "X44", "X61", "X64", "X71", "X72", "X60",
];
const AUTHORITATIVE_ITEMS = [
  "X5", "X7", "X19", "X33", "X43", "X47", "X52", "X62", "X65", "X67", "X78", "X80",
];
const AUTHORITARIAN_ITEMS = [
  "X4", "X11", "X18", "X24", "X30", "X32", "X35", "X38", "X39", "X48", "X70", "X76",
];

const STYLE_ORDER = ["Authoritarian", "Authoritative", "Permissive"];
const CENTROIDS = {
  Authoritarian: [1.864583, 4.083333, 3.15625],
  Authoritative: [2.125, 4.387821, 2.285256],
  Permissive: [2.645833, 3.802083, 2.458333],
};
const BETA = { Permissive: 1.205, Authoritative: 1, Authoritarian: 1.325 };
const NORMS = {
  Permissive: { mean: 2.093652, sd: 0.516713 },
  Authoritative: { mean: 4.245453, sd: 0.530544 },
  Authoritarian: { mean: 2.533141, sd: 0.730939 },
};

function erf(value) {
  const sign = value < 0 ? -1 : 1;
  const x = Math.abs(value);
  const t = 1 / (1 + 0.3275911 * x);
  const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x);
  return sign * y;
}

function percentile(z) {
  return 100 * 0.5 * (1 + erf(z / Math.sqrt(2)));
}

function meanFor(answers, items) {
  return items.reduce((sum, item) => sum + answers[item], 0) / items.length;
}

function distance(profile, centroid) {
  return Math.sqrt(profile.reduce((sum, value, index) => sum + ((value - centroid[index]) ** 2), 0));
}

export function validateAnswers(answers) {
  if (!answers || typeof answers !== "object" || Array.isArray(answers)) return false;
  const keys = Object.keys(answers).sort();
  const expected = [...ITEM_LIST].sort();
  return keys.length === expected.length
    && keys.every((key, index) => key === expected[index])
    && expected.every((key) => Number.isInteger(answers[key]) && answers[key] >= 1 && answers[key] <= 5);
}

export function calculatePps(answers) {
  if (!validateAnswers(answers)) throw new Error("All 36 PPS answers must be integers from 1 to 5.");

  const means = {
    Permissive: meanFor(answers, PERMISSIVE_ITEMS),
    Authoritative: meanFor(answers, AUTHORITATIVE_ITEMS),
    Authoritarian: meanFor(answers, AUTHORITARIAN_ITEMS),
  };
  const profile = [means.Permissive, means.Authoritative, means.Authoritarian];
  const distances = Object.fromEntries(
    STYLE_ORDER.map((style) => [style, distance(profile, CENTROIDS[style])]),
  );
  const effectiveDistances = Object.fromEntries(
    STYLE_ORDER.map((style) => [style, distances[style] * BETA[style]]),
  );
  const finalStyle = STYLE_ORDER.reduce(
    (best, style) => effectiveDistances[style] < effectiveDistances[best] ? style : best,
    STYLE_ORDER[0],
  );
  const zScores = Object.fromEntries(
    STYLE_ORDER.map((style) => [style, (means[style] - NORMS[style].mean) / NORMS[style].sd]),
  );
  const percentiles = Object.fromEntries(
    STYLE_ORDER.map((style) => [style, percentile(zScores[style])]),
  );
  const similarityRaw = Object.fromEntries(
    STYLE_ORDER.map((style) => [style, Math.exp(-effectiveDistances[style])]),
  );
  const similarityTotal = Object.values(similarityRaw).reduce((sum, value) => sum + value, 0);
  const similarities = Object.fromEntries(
    STYLE_ORDER.map((style) => [style, similarityRaw[style] / similarityTotal]),
  );

  return { means, distances, effectiveDistances, finalStyle, zScores, percentiles, similarities };
}
