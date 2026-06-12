export function isNetworkError(error: any): boolean {
  const errorMsg = error?.message || String(error);
  return error instanceof TypeError || 
    errorMsg.toLowerCase().includes('failed to fetch') || 
    errorMsg.toLowerCase().includes('networkerror') ||
    errorMsg.toLowerCase().includes('fetch failed');
}
