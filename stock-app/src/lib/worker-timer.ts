/**
 * A simple worker-based timer to bypass browser background throttling.
 * This runs in a separate thread and is more reliable than setInterval in inactive tabs.
 */
export const createWorkerInterval = (callback: () => void, ms: number) => {
  if (typeof window === 'undefined') return () => {};

  const blob = new Blob([
    `self.onmessage = (e) => {
      setInterval(() => self.postMessage('tick'), e.data);
    };`
  ], { type: 'application/javascript' });
  
  const worker = new Worker(URL.createObjectURL(blob));
  
  worker.onmessage = () => {
    callback();
  };
  
  worker.postMessage(ms);
  
  return () => {
    worker.terminate();
    URL.revokeObjectURL(worker.toString());
  };
};
