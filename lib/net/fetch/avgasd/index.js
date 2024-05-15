// mod.tsx
import { h as h2, render } from "preact";
import htm from "htm";

// download.tsx
import { h, Fragment, Component } from "preact";
import { signal, computed, effect, batch } from "@preact/signals";

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
  downloadingNames = signal([]);
  downloadingProgress = signal({});
  downloadingInfo = computed(() => {
    let result = [];
    let progress = this.downloadingProgress.value;
    for (let name of this.downloadingNames.value) {
      result.push(
        /* @__PURE__ */ h("li", null, name, ": ", progress[name], "%")
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
    let result = /* @__PURE__ */ new Map();
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
            "User-Agent": navigator.userAgent
          })
        }).then(async (response) => {
          let current = 0;
          let total = parseInt(response.headers.get("content-length"));
          let reader = response.body.getReader();
          let resultCollection = [];
          this.downloadingProgress.value = {
            ...this.downloadingProgress.value,
            name: 0
          };
          this.downloadingNames.value = [...this.downloadingNames.value, name];
          while (true) {
            const { value, done } = await reader.read();
            if (done) {
              result.set(name, new Blob(resultCollection));
              this.downloadingProgress.value = {
                ...this.downloadingProgress.value,
                name: void 0
              };
              batch(() => {
                delete this.downloadingProgress.value[name];
                this.downloadingNames.value = this.downloadingNames.value.filter(
                  (key_1) => key_1 != name
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
              name: Math.floor(current / total * 100) / 100
            };
          }
        }).catch((e) => {
          console.error(`${name}: ${e}`);
        });
      });
    }
  }
  render() {
    return /* @__PURE__ */ h(Fragment, null, /* @__PURE__ */ h("h1", null, "Current Downloading"), /* @__PURE__ */ h("ul", null, "$", this.downloadingInfo));
  }
};

// mod.tsx
var html = htm.bind(h2);
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
