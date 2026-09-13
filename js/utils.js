// utils.js — small, pure, dependency-free helpers.
const Utils = {
  debounce(fn, wait = 200) {
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), wait);
    };
  },

  async fetchJSON(path) {
    const res = await fetch(path);
    if (!res.ok) throw new Error(`Failed to load ${path}: ${res.status}`);
    return res.json();
  },

  el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  },

  // Safe text setter — never use innerHTML for dynamic/user-adjacent data.
  setText(node, text) {
    node.textContent = text ?? "";
  },

  byId(id) {
    return document.getElementById(id);
  },

  // Triggers a browser download of `obj` as a pretty-printed JSON file.
  downloadJSON(filename, obj) {
    const blob = new Blob([JSON.stringify(obj, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  },

  // Reads a File (e.g. from an <input type="file">) and parses it as JSON.
  // Rejects with a plain Error on unreadable files or invalid JSON.
  readFileAsJSON(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        try {
          resolve(JSON.parse(reader.result));
        } catch (err) {
          reject(new Error("الملف مش JSON صالح."));
        }
      };
      reader.onerror = () => reject(new Error("تعذّرت قراءة الملف."));
      reader.readAsText(file);
    });
  }
};
