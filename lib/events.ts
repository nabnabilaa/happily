import { EventEmitter } from 'events';

// Prevent multiple instances in development due to HMR
const globalForEvents = globalThis as unknown as {
  hpEventEmitter: EventEmitter | undefined;
};

export const hpEventEmitter = globalForEvents.hpEventEmitter ?? new EventEmitter();

if (process.env.NODE_ENV !== 'production') {
  globalForEvents.hpEventEmitter = hpEventEmitter;
}

// Increase max listeners since many connections might be open
hpEventEmitter.setMaxListeners(100);
