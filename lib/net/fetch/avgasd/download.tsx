import { h, Fragment, JSX, Component, ComponentChild } from "preact";
import { useEffect } from "preact/hooks";
import { signal, computed, effect, batch } from "@preact/signals";

import type { FileList } from "./type";
import { Mutex } from "./mutex";

export class App extends Component<DownloadProps> {
	private coreNumber = navigator.hardwareConcurrency;
	private mutex = new Mutex();
	downloadingNames = signal([] as string[]);
	downloadingProgress = signal({} as Record<string, number>);
	downloadingInfo = computed(() => {
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
			let length = this.downloadingNames.value.length;

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

						this.downloadingProgress.value = {
							...this.downloadingProgress.value,
							name: 0,
						};
						this.downloadingNames.value = [...this.downloadingNames.value, name];

						while (true) {
							const { value, done } = await reader.read();
							if (done) {
								result.set(name, new Blob(resultCollection));
								this.downloadingProgress.value = {
									...this.downloadingProgress.value,
									name: undefined,
								};
								batch(() => {
									delete this.downloadingProgress.value[name];
									this.downloadingNames.value = this.downloadingNames.value.filter(
										key_1 => key_1 != name,
									);
								});

								if (++currentLength >= totalLength) {
									this.props.onFinished(result);
								}
								return;
							}
							resultCollection.push(value);
							current += value.byteLength;
							this.downloadingProgress.value = {
								...this.downloadingProgress.value,
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
				<ul>${this.downloadingInfo}</ul>
			</>
		);
	}
}

export interface DownloadProps {
	files: FileList;

	onFinished: (values: Map<string, Blob>) => void;
}
