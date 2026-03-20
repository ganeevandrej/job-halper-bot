export const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

export const randomDelay = async (
  minMs: number = 700,
  maxMs: number = 1600,
): Promise<void> => {
  const duration = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
  await sleep(duration);
};
