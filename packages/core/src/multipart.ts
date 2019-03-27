
export interface FileUploadInfo {
    field: string,
    fileName: string,
    originalName: string,
    mime: string,
    size: number,
    encoding: string
}

export interface FileParser {
    save(subDirectory?: string): Promise<FileUploadInfo[]>
}