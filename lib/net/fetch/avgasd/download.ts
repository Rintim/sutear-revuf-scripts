import { h } from "preact";
import { useEffect } from "preact/hooks";
import { useSignal, useComputed, useSignalEffect } from "@preact/signals";
import htm from "htm";

import type { FileList } from "./type";
import { Mutex } from "./mutex";

const html = htm.bind(h);

export function App(props: DownloadProps) {
	const coreNumber = navigator.hardwareConcurrency;

	let downloadingNames = useSignal([] as string[]);
	let downloadingProgress = useSignal({} as Record<string, number>);
	let downloadingInfo = useComputed(() => {
		let result = [];
		let progress = downloadingProgress.value;

		for (let name of downloadingNames.value) {
			result.push(html`<li>${name}: ${progress[name]}%</li>`);
		}

		return result;
	});

	let mutex = new Mutex();
	useSignalEffect(() => {
		let length = downloadingNames.value.length;

		if (length > coreNumber) mutex.lock();
		else mutex.unlock();
	});

	useEffect(() => {
		let result = new Map<string, Blob>();

		let files = props.files.slice(0);
		let totalLength = files.length;
		let currentLength = 0;

		while (files.length) {
			mutex.wait().then(() => {
				let [name, data] = files.shift();
				let url = data.url();

				fetch(url, {
					credentials: "same-origin",
					headers: new Headers({
						"User-Agent": navigator.userAgent,
					}),
				})
					.then(async response => {
						let current = 0;
						let total = parseInt(response.headers.get("content-length"));
						let reader = response.body.getReader();
						let resultCollection = [] as Uint8Array[];

						downloadingProgress.value = {
							...downloadingProgress.value,
							name: 0,
						};
						downloadingNames.value = [...downloadingNames.value, name];

						while (true) {
							const { value, done } = await reader.read();
							if (done) {
								result.set(name, new Blob(resultCollection));
								downloadingProgress.value = {
									...downloadingProgress.value,
									name: undefined,
								};
								delete downloadingProgress.value[name];
								downloadingNames.value = downloadingNames.value.filter(
									key_1 => key_1 != name,
								);

								if (++currentLength >= totalLength) {
									props.onFinished(result);
								}
								return;
							}
							resultCollection.push(value);
							current += value.byteLength;
							downloadingProgress.value = {
								...downloadingProgress.value,
								name: Math.floor((current / total) * 100) / 100,
							};
						}
					})
					.catch(e => {
						console.error(`${name}: ${e}`);
					});
			});
		}

		return () => {};
	}, []);

	return html`
		<h1>Current Downloading</h1>
		<ul>
			${downloadingInfo}
		</ul>
	`;
}

export interface DownloadProps {
	files: FileList;

	onFinished: (values: Map<string, Blob>) => void;
}
