let _broadcast = null;

function registerBroadcast(fn) {
  _broadcast = fn;
}

function broadcast(payload) {
  if (_broadcast) {
    _broadcast(payload);
  } else {
    console.warn('[broadcast.js] No broadcast function registered!');
  }
}

module.exports = { registerBroadcast, broadcast };
