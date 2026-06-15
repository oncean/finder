class Store {
  constructor() {
    this.state = {};
    this.listeners = {};
  }

  set(key, value) {
    this.state[key] = value;
    this.notify(key);
  }

  get(key, defaultValue = null) {
    return this.state[key] !== undefined ? this.state[key] : defaultValue;
  }

  subscribe(key, callback) {
    if (!this.listeners[key]) {
      this.listeners[key] = [];
    }
    this.listeners[key].push(callback);
  }

  unsubscribe(key, callback) {
    if (this.listeners[key]) {
      this.listeners[key] = this.listeners[key].filter(cb => cb !== callback);
    }
  }

  notify(key) {
    if (this.listeners[key]) {
      this.listeners[key].forEach(cb => cb(this.state[key]));
    }
  }
}

module.exports = new Store();
