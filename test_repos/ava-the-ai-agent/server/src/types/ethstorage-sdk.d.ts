declare module 'ethstorage-sdk' {
  export interface UploadCallback {
    onProgress: (progress: number, count: number, isChange: boolean) => void;
    onFail: (err: Error) => void;
    onFinish: (totalUploadChunks: number, totalUploadSize: number, totalStorageCost: number) => void;
  }

  export interface DownloadCallback {
    onProgress: (progress: number, count: number, chunk: Uint8Array) => void;
    onFail: (error: Error) => void;
    onFinish: () => void;
  }

  export interface UploadRequest {
    key: string;
    content: Buffer;
    type: number;
    callback: UploadCallback;
  }

  export interface EthStorageConfig {
    rpc: string;
    ethStorageRpc: string;
    privateKey: `0x${string}`;
  }

  export interface FlatDirectoryConfig {
    rpc: string;
    privateKey: `0x${string}`;
    address?: `0x${string}`;
  }

  export class FlatDirectory {
    static create(config: FlatDirectoryConfig): Promise<FlatDirectory>;
    deploy(): Promise<void>;
    upload(request: UploadRequest): Promise<void>;
    download(key: string, callback: DownloadCallback): Promise<void>;
  }

  export class EthStorage {
    static create(config: EthStorageConfig): Promise<EthStorage>;
  }
} 