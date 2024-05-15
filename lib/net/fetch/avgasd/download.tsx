import { h, Fragment, JSX } from "preact";
import { useSignal, useComputed, useSignalEffect } from "@preact/signals";

import type { FileList } from "./type.ts";
import { Mutex } from "./mutex.ts";

export function App(props: DownloadProps) {
	const coreNumber = navigator.hardwareConcurrency;

	let downloadingNames = useSignal([] as string[]);
	let downloadingProgress = useSignal({} as Record<string, number>);
	let downloadingInfo = useComputed(() => {
		let result: JSX.Element[] = [];
		let progress = downloadingProgress.value;

		for (let name of downloadingNames.value) {
			result.push(
				<li>
					{name}: {progress[name]}%
				</li>,
			);
		}

		return result;
	});

	let mutex = new Mutex();
	useSignalEffect(() => {
		let length = downloadingNames.value.length;

		if (length > coreNumber) mutex.lock();
		else mutex.unlock();
	});

	queueMicrotask(async () => {
		let result = new Map<string, Blob>();

		let files = props.files.slice(0);
		let totalLength = files.length;
		let currentLength = 0;

		while (files.length) {
			await mutex.wait();

			let [name, data] = files.shift();
			let url = data.url();

			try {
				let response = await fetch(url, {
					credentials: "same-origin",
					headers: new Headers({
						"User-Agent": navigator.userAgent,
					}),
				});

				let current = 0;
				let total = parseInt(response.headers.get("content-length"));
				let reader = response.body.getReader();
				let resultCollection = [] as Uint8Array[];

				downloadingProgress.value = {
					...downloadingProgress.value,
					name: 0,
				};
				downloadingNames.value = [...downloadingNames.value, name];

				reader.read().then(function read({ value, done }) {
					if (done) {
						result.set(name, new Blob(resultCollection));
						downloadingProgress.value = {
							...downloadingProgress.value,
							name: undefined,
						};
						delete downloadingProgress.value[name];
						downloadingNames.value = downloadingNames.value.filter(key => key != name);

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
					return reader.read().then(read);
				});
			} catch (e) {
				console.error(`${name}: ${e}`);
			}
		}
	});

	return (
		<>
			<h1>Current Downloading</h1>
			<ul>{downloadingInfo}</ul>
		</>
	);
}

export interface DownloadProps {
	files: FileList;

	onFinished: (values: Map<string, Blob>) => void;
}
