/** @jsx h */
/** @jsxFrag Fragment */
import JSZip from "jszip";
import { h, Fragment, render } from "preact";
import { effect, useSignal } from "@preact/signals";

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

export interface FileData {
	fileName: string;
	fileSize: string;
	initSize: () => void;
	md5: string;
	url: () => string;
}

function init(children: HTMLElement[]) {
	return children.map(child => {
		let status = child.hidden;
		child.hidden = true;
		return status;
	});
}

async function download(map: [string, FileData][], body: HTMLElement = document.body) {
	const coreNumber = navigator.hardwareConcurrency;

	let result = new Map<string, Blob>();
	let element = document.createElement("main");
	let mutex: Promise<void> | null = null;
	let mutexResolve: (() => void) | null = null;

	let downloading = useSignal([] as [string, Promise<void>][]);
	effect(() => {
		let length = downloading.value.length;
		if (length <= coreNumber && mutexResolve) {
			mutexResolve();
			mutexResolve = null;
		} else if (length > coreNumber && !mutexResolve) {
			mutex = new Promise(resolve => (mutexResolve = resolve));
		}
	});

	render(
		<>
			<p>Current Downloadings:</p>
			<>
				{downloading.value.map(([name]) => (
					<p>{name}</p>
				))}
			</>
		</>,
		element,
	);

	while (map.length > 0) {
		if (mutex) await mutex;

		let [name, data] = map.shift()!;
		downloading.value = [
			...downloading.peek(),
			[
				name,
				fetch(data.url(), {
					headers: new Headers({
						"User-Agent": navigator.userAgent,
					}),
					credentials: "same-origin",
				})
					.then(res => res.blob())
					.then(blob => {
						result.set(name, blob);
						downloading.value = downloading.value.filter(([key]) => key != name);
					}),
			],
		];
	}

	element.remove();

	return result;
}
