(function () {
  'use strict';

  const namespace = 'jqil:finance:hainan2026:v1:';
  const activityIds = ['data-challenge', 'debt-detective', 'deal-room', 'future-portfolio'];
  const mounts = Object.create(null);
  const initialized = Object.create(null);
  let storageAvailable = true;
  let activeView;

  function updateStorageNotice() {
    const message = storageAvailable ? '进度保存在此浏览器' : '进度仅在本次浏览中保留';
    document.querySelectorAll('[data-storage-note]').forEach(node => { node.textContent = message; });
  }

  function progress(id, normalize) {
    let data;
    try {
      data = window.localStorage.getItem(namespace + id);
    } catch (_) {
      storageAvailable = false;
    }
    let record = null;
    try { record = JSON.parse(data || 'null'); } catch (_) { /* Restore the activity defaults. */ }
    return normalize(record);
  }

  function save(id, state) {
    if (storageAvailable) {
      try { window.localStorage.setItem(namespace + id, JSON.stringify(state)); }
      catch (_) { storageAvailable = false; }
    }
    updateStorageNotice();
  }

  function focus(node) {
    if (!node) return;
    try { node.focus({ preventScroll: true }); } catch (_) { node.focus(); }
    if (node.getBoundingClientRect().bottom > window.innerHeight || node.getBoundingClientRect().top < 0) {
      node.scrollIntoView({ block: 'start' });
    }
  }

  function navigate(moveFocus) {
    if (location.hash === '#main') {
      if (moveFocus) focus(document.getElementById('main'));
      return;
    }
    const id = location.hash.slice(1);
    const next = activityIds.indexOf(id) >= 0 ? id : 'activities';
    const view = document.getElementById(next);
    if (mounts[next] && !initialized[next]) {
      mounts[next](view.querySelector('[data-content]'));
      initialized[next] = true;
    }
    document.querySelectorAll('[data-view]').forEach(panel => { panel.hidden = panel !== view; });
    if (moveFocus && activeView !== next) {
      window.scrollTo(0, 0);
      focus(view.querySelector('h1'));
    }
    activeView = next;
    updateStorageNotice();
  }

  window.JQFinance = {
    register(id, mount) { mounts[id] = mount; },
    progress,
    save,
    focus,
  };

  document.addEventListener('DOMContentLoaded', () => {
    window.addEventListener('hashchange', () => navigate(true));
    navigate(false);
  });
}());
