import { EventEmitter } from 'events';

// Create a global event emitter instance that persists across Next.js hot-reloads
if (!global.productEvents) {
  global.productEvents = new EventEmitter();
  global.productEvents.setMaxListeners(0); // one listener per open storefront tab (live product updates)
}

export const productEvents = global.productEvents;
