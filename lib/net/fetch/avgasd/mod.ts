import JSZip from "jszip";
import { h, render } from "preact";
import htm from "htm";

import type { FileData, FileList } from "./type";
import { App as DownloadApp } from "./download";

const html = htm.bind(h);

export async function downloadFiles(
	files: Record<string, FileData>,
	name: string = "game",
	body: HTMLElement = document.body,
) {
	let fileList = Object.entries(files);

	let bodyChildElements = Array.from(body.childNodes).filter(
		child => child instanceof HTMLElement,
	) as unknown as HTMLElement[];
	let originHiddenStatus = init(bodyChildElements);

	let fileContents = await download(fileList, body);
	console.log(fileContents);
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
		resolve => void render(html`<${DownloadApp} files=${map} onFinished=${resolve} />`, element),
	);

	element.remove();
	return result;
}
