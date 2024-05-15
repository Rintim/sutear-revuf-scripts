export interface FileData {
	fileName: string;
	fileSize: string;
	initSize: () => void;
	md5: string;
	url: () => string;
}

export type FileList = [name: string, file: FileData][];
