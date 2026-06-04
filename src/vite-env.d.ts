/// <reference types="vite/client" />

declare module '*.geojson' {
    // GeoJSON files are bundled as plain JSON objects by Vite.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const value: Record<string, any>;
    export default value;
}

interface FileSystemHandlePermissionDescriptor {
    mode?: 'read' | 'readwrite';
}

interface FileSystemDirectoryHandle {
    queryPermission?(descriptor?: FileSystemHandlePermissionDescriptor): Promise<PermissionState>;
    requestPermission?(descriptor?: FileSystemHandlePermissionDescriptor): Promise<PermissionState>;
    entries(): AsyncIterableIterator<[string, FileSystemFileHandle | FileSystemDirectoryHandle]>;
}
