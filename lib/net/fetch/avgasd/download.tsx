import { h, Fragment, JSX, Component, ComponentChild } from "preact";

import type { FileData, FileList } from "./type";
import { Mutex } from "./mutex";

export class App extends Component<DownloadProps, DownloadState> {
	private coreNumber = navigator.hardwareConcurrency;
	private mutex = new Mutex();

	constructor() {
		super();
		this.state = {
			downloadingNames: [],
			downloadingProgress: {},
		};
	}

	async componentDidMount() {
		let result = new Map<string, Blob>();

		let files = this.props.files.slice(0);

		let fallbackCount = new Map<string, number>();
		let currentQueue = files;
		while (currentQueue.length) {
			let nextLoop = currentQueue;
			currentQueue.length = 0;

			let thisTurnPromises = [];
			for (const [name, data] of nextLoop) {
				await this.mutex.wait();

				let folders = name.split("/");
				if (folders.length <= 1 || /[a-z]:/.test(folders[0])) continue;

				this.setState({
					downloadingProgress: {
						...this.state.downloadingProgress,
						[name]: 0,
					},
					downloadingNames: [...this.state.downloadingNames, name],
				});

				let url = data.url();

				thisTurnPromises.push(
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

							while (true) {
								const { value, done } = await reader.read();
								if (done) {
									result.set(name, new Blob(resultCollection));

									let progress = this.state.downloadingProgress;
									delete progress[name];
									this.setState({
										downloadingNames: this.state.downloadingNames.filter(
											key => key != name,
										),
										downloadingProgress: progress,
									});
									break;
								}
								resultCollection.push(value);
								current += value.byteLength;

								this.setState({
									downloadingProgress: {
										...this.state.downloadingProgress,
										[name]: Math.floor((current / total) * 10000) / 100,
									},
								});
							}
						})
						.catch(e => {
							console.error(`${name}: ${e}`);

							let progress = this.state.downloadingProgress;
							delete progress[name];
							this.setState({
								downloadingNames: this.state.downloadingNames.filter(key => key != name),
								downloadingProgress: progress,
							});

							if (!fallbackCount.has(name)) fallbackCount.set(name, 0);
							let count = fallbackCount.get(name) + 1;
							fallbackCount.set(name, count);

							if (count <= 5) {
								currentQueue.push([name, data]);
							}
						}),
				);
			}

			await Promise.allSettled(thisTurnPromises);
		}

		this.props.onFinished(result);
	}

	render(_props, state: DownloadState): ComponentChild {
		let result: JSX.Element[] = [];
		let progress = state.downloadingProgress;
		let names = state.downloadingNames;

		for (let name of names) {
			result.push(
				<li>
					{name}: {progress[name]}%
				</li>,
			);
		}

		let length = names.length;

		if (length > this.coreNumber) this.mutex.lock();
		else this.mutex.unlock();

		return (
			<>
				<h1>Current Downloading</h1>
				<ul>{result}</ul>
			</>
		);
	}
}

export interface DownloadProps {
	files: FileList;

	onFinished: (values: Map<string, Blob>) => void;
}

export interface DownloadState {
	// downloadingInfo: ComponentChild;
	downloadingProgress: Record<string, number>;
	downloadingNames: string[];
}
