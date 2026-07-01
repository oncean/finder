class EventBus {
  constructor() {
    this.listeners = {};
  }

  on(eventName, callback) {
    if (!this.listeners[eventName]) {
      this.listeners[eventName] = [];
    }
    this.listeners[eventName].push(callback);
  }

  off(eventName, callback) {
    if (!this.listeners[eventName]) return;
    this.listeners[eventName] = this.listeners[eventName].filter(cb => cb !== callback);
  }

  trigger(eventName, ...args) {
    if (!this.listeners[eventName]) return;
    this.listeners[eventName].forEach(callback => callback(...args));
  }
}

module.exports = new EventBus();