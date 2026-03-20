const TELEGRAM_LIMIT = 4096;

export const splitTelegramMessage = (text: string): string[] => {
  if (text.length <= TELEGRAM_LIMIT) {
    return [text];
  }

  const chunks: string[] = [];
  let remaining = text;

  while (remaining.length > TELEGRAM_LIMIT) {
    let splitIndex = remaining.lastIndexOf("\n", TELEGRAM_LIMIT);
    if (splitIndex < 0) {
      splitIndex = TELEGRAM_LIMIT;
    }

    chunks.push(remaining.slice(0, splitIndex).trim());
    remaining = remaining.slice(splitIndex).trim();
  }

  if (remaining.length > 0) {
    chunks.push(remaining);
  }

  return chunks;
};
