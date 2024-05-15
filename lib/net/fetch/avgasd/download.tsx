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

	componentDidMount() {
		let result = new Map<string, Blob>();

		let files = this.props.files.slice(0);
		let totalLength = files.length;
		let currentLength = 0;

		function parse(name: string, data: FileData) {
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

					this.setState({
						downloadingProgress: {
							...this.state.downloadingProgress,
							[name]: 0,
						},
						downloadingNames: [...this.state.downloadingNames, name],
					});

					while (true) {
						const { value, done } = await reader.read();
						if (done) {
							result.set(name, new Blob(resultCollection));

							let progress = this.state.downloadingProgress;
							delete progress[name];
							this.setState({
								downloadingNames: this.state.downloadingNames.filter(key => key != name),
								downloadingProgress: progress,
							});

							if (++currentLength >= totalLength) {
								this.props.onFinished(result);
							}
							return;
						}
						resultCollection.push(value);
						current += value.byteLength;

						this.setState({
							downloadingProgress: {
								...this.state.downloadingProgress,
								[name]: Math.floor((current / total) * 100) / 100,
							},
						});
					}
				})
				.catch(e => {
					console.error(`${name}: ${e}`);
				});
		}

		files.reduce(
			(last, [name, data]) => last.then(this.mutex.wait).then(() => void parse(name, data)),
			Promise.resolve(),
		);
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
