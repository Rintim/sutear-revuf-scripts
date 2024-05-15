// mod.tsx
import { h as h2, render } from "preact";

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
    queueMicrotask(async () => {
      while (files.length) {
        this.mutex.wait().then(() => {
          let [name, data] = files.shift();
          let url = data.url();
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
            this.setState({
              downloadingProgress: {
                ...this.state.downloadingProgress,
                [name]: 0
              },
              downloadingNames: [...this.state.downloadingNames, name]
            });
            while (true) {
              const { value, done } = await reader.read();
              if (done) {
                result.set(name, new Blob(resultCollection));
                let progress = this.state.downloadingProgress;
                delete progress[name];
                this.setState({
                  downloadingNames: this.state.downloadingNames.filter(
                    (key) => key != name
                  ),
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
                  [name]: Math.floor(current / total * 100) / 100
                }
              });
            }
          }).catch((e) => {
            console.error(`${name}: ${e}`);
          });
        });
      }
    });
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
    return /* @__PURE__ */ h(Fragment, null, /* @__PURE__ */ h("h1", null, "Current Downloading"), /* @__PURE__ */ h("ul", null, "$", result));
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
  console.log(fileContents);
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
    (resolve) => void render(/* @__PURE__ */ h2(App, { files: map, onFinished: resolve }), element)
  );
  element.remove();
  return result;
}
export {
  downloadFiles
};
