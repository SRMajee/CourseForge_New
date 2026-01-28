const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  retries = 3,
): Promise<T> {
  for (let i = 0; i < retries; i++) {
    try {
      return await operation();
    } catch (error: any) {
      // Check for Rate Limits (429) or Service Overload (503)
      if (
        error?.status === 429 ||
        error?.response?.status === 429 ||
        error?.status === 503
      ) {
        const delay = Math.pow(2, i) * 4000; // 4s, 8s, 16s, 32s, 64s (Total ~124s coverage)
        console.warn(
          `⚠️ [ModelGateway] Rate Limit (429). Retrying in ${delay}ms...`,
        );
        await sleep(delay);
        continue;
      }
      throw error; // If it's a real error (e.g. Invalid Key), throw immediately
    }
  }
  throw new Error("Max retries exceeded for Model API");
}