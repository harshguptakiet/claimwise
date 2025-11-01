export const delay = (ms: number): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

export const getInitials = (name: string): string => {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
};

export const generateClaimId = (): string => {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `CLM-${timestamp}-${random}`;
};

export const retryWithBackoff = async <T,>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> => {
  let lastError: Error | null = null;

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      if (i < maxRetries - 1) {
        await new Promise((resolve) => setTimeout(resolve, delay * Math.pow(2, i)));
      }
    }
  }

  throw lastError;
};

export const groupBy = <T, K extends string | number | symbol>(
  arr: T[],
  key: (item: T) => K
): Record<K, T[]> => {
  return arr.reduce(
    (result, item) => {
      const k = key(item);
      if (!result[k]) {
        result[k] = [];
      }
      result[k].push(item);
      return result;
    },
    {} as Record<K, T[]>
  );
};

export const sortBy = <T,>(
  arr: T[],
  key: (item: T) => any,
  direction: "asc" | "desc" = "asc"
): T[] => {
  return [...arr].sort((a, b) => {
    const aVal = key(a);
    const bVal = key(b);
    const comparison = aVal > bVal ? 1 : -1;
    return direction === "asc" ? comparison : -comparison;
  });
};

export const filterBy = <T,>(
  arr: T[],
  predicate: (item: T) => boolean
): T[] => {
  return arr.filter(predicate);
};
