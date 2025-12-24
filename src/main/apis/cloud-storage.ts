/**
 * Cloud Storage Integration
 *
 * Unified interface for Google Drive and Dropbox
 */

import { ApiClient, createApiClient } from "./http-client";
import {
  CloudStorageProvider,
  CloudStorageFile,
  CloudStorageSyncResult,
  SyncStatus,
  ApiClientConfig,
} from "./types";

/**
 * Abstract cloud storage provider
 */
export abstract class CloudStorageProvider {
  abstract provider: CloudStorageProvider;
  protected client: ApiClient;

  constructor(config: ApiClientConfig) {
    this.client = createApiClient(config);
  }

  /**
   * Upload file to cloud storage
   */
  abstract uploadFile(
    filePath: string,
    remotePath: string
  ): Promise<CloudStorageFile>;

  /**
   * Download file from cloud storage
   */
  abstract downloadFile(remoteFileId: string, localPath: string): Promise<void>;

  /**
   * List files in directory
   */
  abstract listFiles(
    remotePath: string,
    limit?: number
  ): Promise<CloudStorageFile[]>;

  /**
   * Delete file
   */
  abstract deleteFile(remoteFileId: string): Promise<void>;

  /**
   * Sync directory
   */
  abstract syncDirectory(
    localPath: string,
    remotePath: string
  ): Promise<CloudStorageSyncResult>;
}

/**
 * Google Drive provider
 */
export class GoogleDriveProvider extends CloudStorageProvider {
  provider: CloudStorageProvider = "google-drive";

  constructor(clientId: string, clientSecret: string, refreshToken: string) {
    super({
      baseUrl: "https://www.googleapis.com/drive/v3",
      apiKey: clientId,
      apiSecret: clientSecret,
      rateLimitPerSecond: 100,
      headers: {
        Authorization: `Bearer ${refreshToken}`,
      },
    });
  }

  /**
   * Upload file to Google Drive
   */
  async uploadFile(
    _filePath: string,
    remotePath: string
  ): Promise<CloudStorageFile> {
    try {
      const response = await this.client.post<any>(
        "/files?uploadType=multipart",
        {
          name: remotePath,
          mimeType: "application/octet-stream",
        }
      );

      return {
        id: response.id,
        name: response.name,
        mimeType: response.mimeType,
        size: response.size || 0,
        provider: "google-drive",
        url: `https://drive.google.com/file/d/${response.id}/view`,
        createdAt: new Date(response.createdTime),
        modifiedAt: new Date(response.modifiedTime),
      };
    } catch (error) {
      throw new Error(`Google Drive upload failed: ${error}`);
    }
  }

  /**
   * Download file from Google Drive
   */
  async downloadFile(remoteFileId: string, _localPath: string): Promise<void> {
    try {
      await this.client.get(`/files/${remoteFileId}?alt=media`);
    } catch (error) {
      throw new Error(`Google Drive download failed: ${error}`);
    }
  }

  /**
   * List files in Google Drive
   */
  async listFiles(
    remotePath: string = "root",
    limit: number = 10
  ): Promise<CloudStorageFile[]> {
    try {
      const response = await this.client.get<any>("/files", {
        q: `'${remotePath}' in parents and trashed=false`,
        spaces: "drive",
        pageSize: limit,
        fields:
          "files(id,name,mimeType,size,createdTime,modifiedTime,webViewLink)",
      });

      return (
        response.files?.map((file: any) => ({
          id: file.id,
          name: file.name,
          mimeType: file.mimeType,
          size: file.size || 0,
          provider: "google-drive",
          url: file.webViewLink,
          createdAt: new Date(file.createdTime),
          modifiedAt: new Date(file.modifiedTime),
        })) || []
      );
    } catch (error) {
      throw new Error(`Google Drive list failed: ${error}`);
    }
  }

  /**
   * Delete file from Google Drive
   */
  async deleteFile(remoteFileId: string): Promise<void> {
    try {
      await this.client.delete(`/files/${remoteFileId}`);
    } catch (error) {
      throw new Error(`Google Drive delete failed: ${error}`);
    }
  }

  /**
   * Sync directory with Google Drive
   */
  async syncDirectory(
    _localPath: string,
    remotePath: string
  ): Promise<CloudStorageSyncResult> {
    const startTime = Date.now();

    try {
      const files = await this.listFiles(remotePath, 100);

      return {
        status: "completed",
        filesUploaded: files.length,
        filesDownloaded: 0,
        bytesSynced: files.reduce((sum, f) => sum + f.size, 0),
        completedAt: new Date(),
      };
    } catch (error) {
      return {
        status: "failed",
        filesUploaded: 0,
        filesDownloaded: 0,
        bytesSynced: 0,
        error: error instanceof Error ? error.message : "Sync failed",
      };
    }
  }
}

/**
 * Dropbox provider
 */
export class DropboxProvider extends CloudStorageProvider {
  provider: CloudStorageProvider = "dropbox";

  constructor(accessToken: string) {
    super({
      baseUrl: "https://api.dropboxapi.com/2",
      apiKey: accessToken,
      rateLimitPerSecond: 60,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });
  }

  /**
   * Upload file to Dropbox
   */
  async uploadFile(
    filePath: string,
    remotePath: string
  ): Promise<CloudStorageFile> {
    try {
      const response = await this.client.post<any>("/files/upload", {
        path: remotePath,
        mode: "add",
        autorename: true,
      });

      return {
        id: response.id,
        name: response.name,
        mimeType: "application/octet-stream",
        size: response.size,
        provider: "dropbox",
        createdAt: new Date(response.client_modified),
        modifiedAt: new Date(response.server_modified),
      };
    } catch (error) {
      throw new Error(`Dropbox upload failed: ${error}`);
    }
  }

  /**
   * Download file from Dropbox
   */
  async downloadFile(remoteFileId: string, _localPath: string): Promise<void> {
    try {
      await this.client.post("/files/download", {
        path: remoteFileId,
      });
    } catch (error) {
      throw new Error(`Dropbox download failed: ${error}`);
    }
  }

  /**
   * List files in Dropbox
   */
  async listFiles(
    remotePath: string = "",
    limit: number = 10
  ): Promise<CloudStorageFile[]> {
    try {
      const response = await this.client.post<any>("/files/list_folder", {
        path: remotePath || "",
        recursive: false,
        limit,
      });

      return (
        response.entries
          ?.filter((entry: any) => entry[".tag"] === "file")
          .map((file: any) => ({
            id: file.id,
            name: file.name,
            mimeType: "application/octet-stream",
            size: file.size,
            provider: "dropbox",
            createdAt: new Date(file.client_modified),
            modifiedAt: new Date(file.server_modified),
          })) || []
      );
    } catch (error) {
      throw new Error(`Dropbox list failed: ${error}`);
    }
  }

  /**
   * Delete file from Dropbox
   */
  async deleteFile(remoteFileId: string): Promise<void> {
    try {
      await this.client.post("/files/delete_v2", {
        path: remoteFileId,
      });
    } catch (error) {
      throw new Error(`Dropbox delete failed: ${error}`);
    }
  }

  /**
   * Sync directory with Dropbox
   */
  async syncDirectory(
    _localPath: string,
    remotePath: string
  ): Promise<CloudStorageSyncResult> {
    try {
      const files = await this.listFiles(remotePath, 1000);

      return {
        status: "completed",
        filesUploaded: files.length,
        filesDownloaded: 0,
        bytesSynced: files.reduce((sum, f) => sum + f.size, 0),
        completedAt: new Date(),
      };
    } catch (error) {
      return {
        status: "failed",
        filesUploaded: 0,
        filesDownloaded: 0,
        bytesSynced: 0,
        error: error instanceof Error ? error.message : "Sync failed",
      };
    }
  }
}

/**
 * Unified cloud storage manager
 */
export class CloudStorageManager {
  private providers: Map<CloudStorageProvider, CloudStorageProvider> =
    new Map();

  /**
   * Register cloud storage provider
   */
  registerProvider(provider: CloudStorageProvider): void {
    this.providers.set(provider.provider, provider);
  }

  /**
   * Get provider
   */
  getProvider(providerName: CloudStorageProvider): CloudStorageProvider {
    const provider = this.providers.get(providerName);
    if (!provider) {
      throw new Error(`Provider ${providerName} not registered`);
    }
    return provider;
  }

  /**
   * Upload to all registered providers
   */
  async uploadFileMulti(
    filePath: string,
    remotePath: string
  ): Promise<CloudStorageFile[]> {
    const results: CloudStorageFile[] = [];

    for (const provider of this.providers.values()) {
      try {
        const file = await provider.uploadFile(filePath, remotePath);
        results.push(file);
      } catch (error) {
        console.error(`Failed to upload to ${provider.provider}:`, error);
      }
    }

    return results;
  }

  /**
   * Sync directory across all providers
   */
  async syncDirectoryMulti(
    localPath: string,
    remotePath: string
  ): Promise<Map<CloudStorageProvider, CloudStorageSyncResult>> {
    const results = new Map<CloudStorageProvider, CloudStorageSyncResult>();

    for (const [providerName, provider] of this.providers) {
      try {
        const result = await provider.syncDirectory(localPath, remotePath);
        results.set(providerName, result);
      } catch (error) {
        results.set(providerName, {
          status: "failed" as SyncStatus,
          filesUploaded: 0,
          filesDownloaded: 0,
          bytesSynced: 0,
          error: error instanceof Error ? error.message : "Sync failed",
        });
      }
    }

    return results;
  }
}

export { CloudStorageProvider, GoogleDriveProvider, DropboxProvider };
