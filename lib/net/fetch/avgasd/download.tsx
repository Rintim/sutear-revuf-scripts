import { h, Fragment, JSX, Component, ComponentChild } from "preact";
import { signal, computed, effect, batch } from "@preact/signals";

import type { FileList } from "./type";
import { Mutex } from "./mutex";

export class App extends Component<DownloadProps> {
	private coreNumber = navigator.hardwareConcurrency;
	private mutex = new Mutex();
	static downloadingNames = signal([] as string[]);
	static downloadingProgress = signal({} as Record<string, number>);
	static downloadingInfo = computed(() => {
		let result: JSX.Element[] = [];
		let progress = this.downloadingProgress.value;

		for (let name of this.downloadingNames.value) {
			result.push(
				<li>
					{name}: {progress[name]}%
				</li>,
			);
		}

		return result;
	});

	constructor() {
		super();
		effect(() => {
			let length = App.downloadingNames.value.length;

			if (length > this.coreNumber) this.mutex.lock();
			else this.mutex.unlock();
		});
	}

	componentDidMount() {
		let result = new Map<string, Blob>();

		let files = this.props.files.slice(0);
		let totalLength = files.length;
		let currentLength = 0;

		while (files.length) {
			this.mutex.wait().then(() => {
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

						App.downloadingProgress.value = {
							...App.downloadingProgress.value,
							name: 0,
						};
						App.downloadingNames.value = [...App.downloadingNames.value, name];

						while (true) {
							const { value, done } = await reader.read();
							if (done) {
								result.set(name, new Blob(resultCollection));

								batch(() => {
									App.downloadingProgress.value = {
										...App.downloadingProgress.value,
										name: undefined,
									};
									delete App.downloadingProgress.value[name];
								});

								App.downloadingNames.value = App.downloadingNames.value.filter(
									key => key != name,
								);

								if (++currentLength >= totalLength) {
									this.props.onFinished(result);
								}
								return;
							}
							resultCollection.push(value);
							current += value.byteLength;
							App.downloadingProgress.value = {
								...App.downloadingProgress.value,
								name: Math.floor((current / total) * 100) / 100,
							};
						}
					})
					.catch(e => {
						console.error(`${name}: ${e}`);
					});
			});
		}
	}

	render(): ComponentChild {
		return (
			<>
				<h1>Current Downloading</h1>
				<ul>${App.downloadingInfo}</ul>
			</>
		);
	}
}

export interface DownloadProps {
	files: FileList;

	onFinished: (values: Map<string, Blob>) => void;
}
