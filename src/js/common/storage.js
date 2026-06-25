(function () {
  "use strict";

  var STORAGE_KEY = "kuku99_gamestate_v1";

  function load() {
    var raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch (e) {
      return null;
    }
  }

  function save(data) {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      return true;
    } catch (e) {
      return false;
    }
  }

  function clear() {
    window.localStorage.removeItem(STORAGE_KEY);
  }

  window.Kuku99 = window.Kuku99 || {};
  window.Kuku99.Storage = {
    KEY: STORAGE_KEY,
    load: load,
    save: save,
    clear: clear
  };
})();
