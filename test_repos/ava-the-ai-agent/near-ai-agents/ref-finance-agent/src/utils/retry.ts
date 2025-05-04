/**
 * Utility function for retrying async operations with exponential backoff
 * 
 * @param fn Function to retry
 * @param retries Maximum number of retries
 * @param delay Initial delay in milliseconds (doubles on each retry)
 * @returns Result of the function
 */
export const retry = async <T>(
  fn: () => Promise<T>,
  retries: number,
  delay = 1000
): Promise<T> => {
  try {
    return await fn();
  } catch (error) {
    if (retries <= 0) throw error;
    await new Promise(resolve => setTimeout(resolve, delay));
    return retry(fn, retries - 1, delay * 2);
  }
}; 