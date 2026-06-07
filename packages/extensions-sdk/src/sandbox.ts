import { AnimeProvider, MangaProvider } from './index';

export class ExtensionSandbox {
  private worker: Worker | null = null;
  private messageId = 0;
  private pendingRequests = new Map<number, { resolve: (val: any) => void; reject: (err: any) => void }>();

  constructor(private extensionCode: string) {
    this.initWorker();
  }

  private initWorker() {
    // Create a blob from the extension code and wrap it to handle messages
    const wrapper = `
      self.onmessage = async function(e) {
        const { id, method, args } = e.data;
        try {
          // The extension code is expected to assign itself to 'self.provider'
          // Example: self.provider = { latest: async () => [...] }
          ${this.extensionCode}
          
          if (!self.provider || typeof self.provider[method] !== 'function') {
            throw new Error('Method ' + method + ' not implemented in extension.');
          }
          
          const result = await self.provider[method](...args);
          self.postMessage({ id, result });
        } catch (error) {
          self.postMessage({ id, error: error.message });
        }
      };
    `;
    const blob = new Blob([wrapper], { type: 'application/javascript' });
    const url = URL.createObjectURL(blob);
    this.worker = new Worker(url);

    this.worker.onmessage = (e) => {
      const { id, result, error } = e.data;
      const request = this.pendingRequests.get(id);
      if (request) {
        if (error) {
          request.reject(new Error(error));
        } else {
          request.resolve(result);
        }
        this.pendingRequests.delete(id);
      }
    };
  }

  public async callMethod(method: string, ...args: any[]): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.worker) return reject(new Error('Worker not initialized'));
      
      const id = ++this.messageId;
      this.pendingRequests.set(id, { resolve, reject });
      this.worker.postMessage({ id, method, args });
      
      // Timeout to prevent hanging
      setTimeout(() => {
        if (this.pendingRequests.has(id)) {
          this.pendingRequests.delete(id);
          reject(new Error('Extension execution timed out'));
        }
      }, 30000);
    });
  }

  public destroy() {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
  }
}
