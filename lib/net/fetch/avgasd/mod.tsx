import { h, render } from "preact";

import type { FileData, FileList } from "./type";
import { App as DownloadApp } from "./download";
import { App as ZipApp } from "./zip";

export async function downloadFiles(
	files: Record<string, FileData>,
	name: string = "game",
	body: HTMLElement = document.body,
): Promise<void> {
	let fileList = Object.entries(files);

	let bodyChildElements = Array.from(body.childNodes).filter(
		child => child instanceof HTMLElement,
	) as unknown as HTMLElement[];
	let originHiddenStatus = init(bodyChildElements);

	let fileContents = await download(fileList, body);

	let zippedFile = await zip(fileContents, body);

	let url = URL.createObjectURL(zippedFile);
	let a = document.createElement("a");
	a.href = url;
	a.download = `${name}.zip`;
	a.addEventListener("click", () => {
		setTimeout(() => {
			URL.revokeObjectURL(url);
		}, 100);
	});
	a.click();
}

function init(children: HTMLElement[]) {
	return children.map(child => {
		let status = child.hidden;
		child.hidden = true;
		return status;
	});
}

async function download(map: FileList, body: HTMLElement = document.body): Promise<Map<string, Blob>> {
	let element = document.createElement("main");

	element.style.width = "100%";
	element.style.height = "100%";
	element.style.backgroundColor = "white";
	body.appendChild(element);

	let result = await new Promise<Map<string, Blob>>(
		resolve => void render(<DownloadApp files={map} onFinished={resolve} />, element),
	);

	element.remove();
	return result;
}

async function zip(map: Map<string, Blob>, body: HTMLElement = document.body): Promise<Blob> {
	let element = document.createElement("main");

	element.style.width = "100%";
	element.style.height = "100%";
	element.style.backgroundColor = "white";
	body.appendChild(element);

	let result = await new Promise<Blob>(
		resolve => void render(<ZipApp files={map} onFinished={resolve} />, element),
	);

	element.remove();
	return result;
}
