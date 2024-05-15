export class Mutex {
	private promise?: Promise<void>;
	private resolve?: () => void;

	lock() {
		if (!this.promise) {
			this.promise = new Promise(resolve => void (this.resolve = resolve));
		}
	}

	unlock() {
		if (this.promise) {
			this.resolve?.();
			this.resolve = undefined;
			this.promise = undefined;
		}
	}

	wait() {
		return this.promise ?? Promise.resolve();
	}
}
