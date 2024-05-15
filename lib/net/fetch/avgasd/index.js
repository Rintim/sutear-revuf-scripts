// mod.tsx
import { h as h3, render } from "preact";

// download.tsx
import { h, Fragment, Component } from "preact";

// mutex.ts
var Mutex = class {
  promise;
  resolve;
  lock() {
    if (!this.promise) {
      this.promise = new Promise((resolve) => void (this.resolve = resolve));
    }
  }
  unlock() {
    if (this.promise) {
      this.resolve?.();
      this.resolve = void 0;
      this.promise = void 0;
    }
  }
  wait() {
    return this.promise ?? Promise.resolve();
  }
};

// download.tsx
var App = class extends Component {
  coreNumber = navigator.hardwareConcurrency;
  mutex = new Mutex();
  constructor() {
    super();
    this.state = {
      downloadingNames: [],
      downloadingProgress: {}
    };
  }
  componentDidMount() {
    let result = /* @__PURE__ */ new Map();
    let files = this.props.files.slice(0);
    let totalLength = files.length;
    let currentLength = 0;
    function parse(name, data) {
      let url = data.url();
      this.setState({
        downloadingProgress: {
          ...this.state.downloadingProgress,
          [name]: 0
        },
        downloadingNames: [...this.state.downloadingNames, name]
      });
      fetch(url, {
        credentials: "same-origin",
        headers: new Headers({
          "User-Agent": navigator.userAgent
        })
      }).then(async (response) => {
        let current = 0;
        let total = parseInt(response.headers.get("content-length"));
        let reader = response.body.getReader();
        let resultCollection = [];
        while (true) {
          const { value, done } = await reader.read();
          if (done) {
            result.set(name, new Blob(resultCollection));
            let progress = this.state.downloadingProgress;
            delete progress[name];
            this.setState({
              downloadingNames: this.state.downloadingNames.filter((key) => key != name),
              downloadingProgress: progress
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
              [name]: Math.floor(current / total * 1e4) / 100
            }
          });
        }
      }).catch((e) => {
        console.error(`${name}: ${e}`);
        let progress = this.state.downloadingProgress;
        delete progress[name];
        this.setState({
          downloadingNames: this.state.downloadingNames.filter((key) => key != name),
          downloadingProgress: progress
        });
      });
    }
    files.reduce(
      (last, [name, data]) => last.then(this.mutex.wait.bind(this.mutex)).then(() => void parse.call(this, name, data)),
      Promise.resolve()
    );
  }
  render(_props, state) {
    let result = [];
    let progress = state.downloadingProgress;
    let names = state.downloadingNames;
    for (let name of names) {
      result.push(
        /* @__PURE__ */ h("li", null, name, ": ", progress[name], "%")
      );
    }
    let length = names.length;
    if (length > this.coreNumber) this.mutex.lock();
    else this.mutex.unlock();
    return /* @__PURE__ */ h(Fragment, null, /* @__PURE__ */ h("h1", null, "Current Downloading"), /* @__PURE__ */ h("ul", null, result));
  }
};

// zip.tsx
import JSZip from "jszip";
import { h as h2, Fragment as Fragment2, Component as Component2 } from "preact";
var App2 = class extends Component2 {
  componentDidMount() {
    let files = this.props.files;
    let zip2 = new JSZip();
    let records = /* @__PURE__ */ new Map();
    records.set("", zip2);
    for (let [name, data] of files) {
      let folders = name.split("/");
      name = folders[folders.length - 1];
      folders = folders.slice(0, folders.length - 1);
      let now = zip2;
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
    zip2.generateAsync({ type: "blob" }, ({ percent, currentFile }) => {
      this.setState({ percent, currentFile });
    }).then(this.props.onFinished);
  }
  render(_props, state) {
    return /* @__PURE__ */ h2(Fragment2, null, /* @__PURE__ */ h2("p", null, "Percent: ", Math.floor(state.percent), "%"), /* @__PURE__ */ h2("p", null, "Current File: ", state.currentFile));
  }
};

// mod.tsx
async function downloadFiles(files, name = "game", body = document.body) {
  let fileList = Object.entries(files);
  let bodyChildElements = Array.from(body.childNodes).filter(
    (child) => child instanceof HTMLElement
  );
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
function init(children) {
  return children.map((child) => {
    let status = child.hidden;
    child.hidden = true;
    return status;
  });
}
async function download(map, body = document.body) {
  let element = document.createElement("main");
  element.style.width = "100%";
  element.style.height = "100%";
  element.style.backgroundColor = "white";
  body.appendChild(element);
  let result = await new Promise(
    (resolve) => void render(/* @__PURE__ */ h3(App, { files: map, onFinished: resolve }), element)
  );
  element.remove();
  return result;
}
async function zip(map, body = document.body) {
  let element = document.createElement("main");
  element.style.width = "100%";
  element.style.height = "100%";
  element.style.backgroundColor = "white";
  body.appendChild(element);
  let result = await new Promise(
    (resolve) => void render(/* @__PURE__ */ h3(App2, { files: map, onFinished: resolve }), element)
  );
  element.remove();
  return result;
}
export {
  downloadFiles
};
