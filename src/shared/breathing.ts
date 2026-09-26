/** Walk, run, and sleep already move. Idle and the short poses can take a slight scale. */
const AUTHORED_MOTION = new Set(['walk', 'run', 'sleep']);

export function allowsBreathingScale(
  animName: string | null | undefined,
  enabled: boolean,
  reduceMotion: boolean,
): boolean {
  if (!enabled || reduceMotion || !animName) return false;
  return !AUTHORED_MOTION.has(animName);
}
