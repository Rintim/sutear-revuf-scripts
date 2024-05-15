import JSZip from "jszip";
import { h, Fragment, JSX, Component, ComponentChild, RenderableProps } from "preact";

export class App extends Component<ZipProps, ZipState> {
	componentDidMount() {
		let files = this.props.files;

		let zip = new JSZip();
		let records = new Map();
		records.set("", zip);
		for (let [name, data] of files) {
			let folders = name.split("/");
			name = folders[folders.length - 1];
			folders = folders.slice(0, folders.length - 1);

			let now = zip;
			for (let i = 1; i <= folders.length; ++i) {
				let current = folders.slice(0, i);
				if (records.has(current)) now = records.get(current);
				else {
					now = now.folder(folders[i - 1]);
					records.set(current, now);
				}
			}

			now.file(name, data);
		}

		zip.generateAsync({ type: "blob" }, ({ percent, currentFile }) => {
			this.setState({ percent, currentFile });
		}).then(this.props.onFinished);
	}

	render(_props?: RenderableProps<ZipProps, any>, state?: Readonly<ZipState>): ComponentChild {
		return (
			<>
				<p>Percent: {Math.floor(state.percent)}%</p>
				<p>Current File: {state.currentFile}</p>
			</>
		);
	}
}

export interface ZipProps {
	files: Map<string, Blob>;
	onFinished: (zipFile: Blob) => void;
}

export interface ZipState {
	percent: number;
	currentFile: string;
}
