
// Type definitions for Chrome extension API
declare namespace chrome {
  export namespace storage {
    export interface StorageChange {
      oldValue?: any;
      newValue?: any;
    }

    export interface StorageChanges {
      [key: string]: StorageChange;
    }

    export interface StorageArea {
      get(keys: string | string[] | object | null, callback: (items: { [key: string]: any }) => void): void;
      set(items: object, callback?: () => void): void;
      remove(keys: string | string[], callback?: () => void): void;
      clear(callback?: () => void): void;
    }

    export const local: StorageArea;
    export const sync: StorageArea;
    export const managed: StorageArea;
    export const session: StorageArea;

    export interface StorageChangedEvent {
      addListener(callback: (changes: StorageChanges, areaName: string) => void): void;
      removeListener(callback: (changes: StorageChanges, areaName: string) => void): void;
      hasListeners(): boolean;
    }

    export const onChanged: StorageChangedEvent;
  }

  export namespace runtime {
    export interface MessageSender {
      tab?: chrome.tabs.Tab;
      frameId?: number;
      id?: string;
      url?: string;
      tlsChannelId?: string;
    }

    export function sendMessage(
      message: any,
      responseCallback?: (response: any) => void
    ): void;
    
    export function sendMessage(
      extensionId: string,
      message: any,
      responseCallback?: (response: any) => void
    ): void;

    export function onMessage(
      callback: (
        message: any,
        sender: MessageSender,
        sendResponse: (response?: any) => void
      ) => void | boolean
    ): void;

    export const lastError: chrome.runtime.LastError | undefined;

    export interface LastError {
      message?: string;
    }
  }

  export namespace action {
    export function setBadgeText(details: { text: string }): void;
    export function setBadgeBackgroundColor(details: { color: string }): void;
  }

  export namespace tabs {
    export interface Tab {
      id?: number;
      index: number;
      pinned: boolean;
      highlighted: boolean;
      windowId?: number;
      active: boolean;
      url?: string;
      title?: string;
      favIconUrl?: string;
      status?: string;
      incognito: boolean;
      width?: number;
      height?: number;
      sessionId?: string;
    }
  }
}
