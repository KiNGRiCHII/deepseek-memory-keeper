// ==UserScript==
// @name         DeepSeek AI Memory Keeper (ULTRA OPTIMIZED)
// @namespace    https://github.com/KiNGRiCHII/deepseek-memory-keeper
// @version      2.0.0
// @description  Saves, encrypts, and syncs DeepSeek chats with local/cloud backup, UI persistence, and localhost fallback.
// @author       KiNGRiCHII
// @license      MIT
// @homepage     https://github.com/KiNGRiCHII/deepseek-memory-keeper
// @supportURL   https://github.com/KiNGRiCHII/deepseek-memory-keeper/issues
// @icon         https://deepseek.com/favicon.ico
// @icon64       https://deepseek.com/favicon-64x64.png
// @updateURL    https://raw.githubusercontent.com/KiNGRiCHII/deepseek-memory-keeper/main/script.meta.js
// @downloadURL  https://raw.githubusercontent.com/KiNGRiCHII/deepseek-memory-keeper/main/script.user.js
// @match        https://chat.deepseek.com/*
// @require      https://cdnjs.cloudflare.com/ajax/libs/crypto-js/4.1.1/crypto-js.min.js
// @resource     customCSS https://raw.githubusercontent.com/KiNGRiCHII/deepseek-memory-keeper/main/styles.css
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_deleteValue
// @grant        GM_listValues
// @grant        GM_addValueChangeListener
// @grant        GM_removeValueChangeListener
// @grant        GM_getResourceText
// @grant        GM_addStyle
// @grant        GM_openInTab
// @grant        GM_registerMenuCommand
// @grant        GM_notification
// @grant        GM_xmlhttpRequest
// @grant        GM_download
// @grant        unsafeWindow
// @connect      localhost
// @connect      deepseek.com
// @connect      googleapis.com
// @run-at       document-idle
// ==/UserScript==
/* eslint-disable */ 
// CryptoJS fallback (if @require fails)
if (typeof CryptoJS === 'undefined') {
    console.log("Loading CryptoJS fallback...");
    try {
        const cryptoJsCode = await fetch('https://cdnjs.cloudflare.com/ajax/libs/crypto-js/4.1.1/crypto-js.min.js');
        eval(await cryptoJsCode.text());
    } catch (e) {
        console.error("CryptoJS load failed:", e);
    }
}
/* -------------------------------
   SECTION 1: INITIAL SETUP & CONFIG
   ------------------------------- */
// ⚙️ ADVANTAGEOUS TO EDIT:
// - `STORAGE_MODE`: Choose "GM" (Tampermonkey), "localStorage", or "localhost".
// - `ENCRYPTION_KEY`: Change this to your own secret key!
// - `LOCALHOST_PORT`: Set your preferred port for local backup.
const STORAGE_MODE = "GM"; // "GM" | "localStorage" | "localhost"
const ENCRYPTION_KEY = "ADD-YOUR-OWN-CUSTOM-PASS-PHRASE-ATLEAST-32Characters-AS-SUCH-IS-GOOD-FOR-AES256_bit_ENCRYPTION_It-Can-Be-Letters-Symbols-Numbers(prettymuchanything)";
const LOCALHOST_PORT = 8080; // For local backup server e.g. 3000

// UI Colors (Edit to match your theme!)
const UI_COLORS = {
  primary: "#1a1a2e",
  secondary: "#16213e",
  accent: "#0f3460",
  text: "#e6e6e6",
  buttonHover: "#4cc9f0",
  success: "#4caf50",
  warning: "#ff9800",
  danger: "#f44336"
};

/* -------------------------------
   SECTION 2: STORAGE SYSTEM (GM/localStorage/localhost)
   ------------------------------- */
class MemorySystem {
  constructor() {
    this.sessionId = "DEEPSEEK_ULTRA_MEMORY";
  }

  // 🔄 Save data (with encryption)
  async save(data) {
    const encrypted = CryptoJS.AES.encrypt(JSON.stringify(data), ENCRYPTION_KEY).toString();

    switch (STORAGE_MODE) {
      case "GM":
        GM_setValue(this.sessionId, encrypted);
        break;
      case "localStorage":
        localStorage.setItem(this.sessionId, encrypted);
        break;
      case "localhost":
        await this._saveToLocalHost(encrypted);
        break;
    }
  }

  // 🔄 Load data (with decryption)
  async load() {
    let encrypted;

    switch (STORAGE_MODE) {
      case "GM":
        encrypted = GM_getValue(this.sessionId);
        break;
      case "localStorage":
        encrypted = localStorage.getItem(this.sessionId);
        break;
      case "localhost":
        encrypted = await this._loadFromLocalHost();
        break;
    }

    if (!encrypted) return null;

    try {
      const bytes = CryptoJS.AES.decrypt(encrypted, ENCRYPTION_KEY);
      return JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
    } catch (e) {
      console.error("Decryption failed:", e);
      return null;
    }
  }

  // ⚠️ Wipe all data
  async wipe() {
    switch (STORAGE_MODE) {
      case "GM":
        GM_deleteValue(this.sessionId);
        break;
      case "localStorage":
        localStorage.removeItem(this.sessionId);
        break;
      case "localhost":
        await this._wipeLocalHost();
        break;
    }
  }

  // 🔄 Localhost backup (fallback)
  async _saveToLocalHost(data) {
    try {
      await GM_xmlhttpRequest({
        method: "POST",
        url: `http://localhost:${LOCALHOST_PORT}/save`,
        data: JSON.stringify({ id: this.sessionId, data }),
        headers: { "Content-Type": "application/json" }
      });
    } catch (e) {
      console.error("Localhost backup failed. Is your server running?");
    }
  }

  async _loadFromLocalHost() {
    try {
      const response = await GM_xmlhttpRequest({
        method: "GET",
        url: `http://localhost:${LOCALHOST_PORT}/load?id=${this.sessionId}`,
        responseType: "json"
      });
      return response.response?.data || null;
    } catch (e) {
      return null;
    }
  }

  async _wipeLocalHost() {
    try {
      await GM_xmlhttpRequest({
        method: "DELETE",
        url: `http://localhost:${LOCALHOST_PORT}/wipe?id=${this.sessionId}`
      });
    } catch (e) {
      console.error("Localhost wipe failed.");
    }
  }
}

/* -------------------------------
   SECTION 3: UI BUILDER (With Persistent Settings)
   ------------------------------- */
class UIBuilder {
  constructor() {
    this.memory = new MemorySystem();
    this.uiSettings = {
      isCollapsed: false,
      lastPosition: { x: 20, y: 20 }
    };
    this.initUI();
  }

  // 🎨 Initialize UI
  async initUI() {
    // Load saved UI settings
    const savedSettings = await this.memory.load("UI_SETTINGS");
    if (savedSettings) this.uiSettings = savedSettings;

    // Create main UI container
    this.ui = document.createElement("div");
    this.ui.id = "deepseek-memory-ui";
    this.ui.style.cssText = `
      position: fixed;
      left: ${this.uiSettings.lastPosition.x}px;
      top: ${this.uiSettings.lastPosition.y}px;
      z-index: 99999;
      background: ${UI_COLORS.primary};
      color: ${UI_COLORS.text};
      padding: 12px;
      border-radius: 8px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
      font-family: 'Segoe UI', Arial, sans-serif;
      width: ${this.uiSettings.isCollapsed ? "40px" : "300px"};
      min-height: 40px;
      transition: all 0.3s ease;
      border: 1px solid ${UI_COLORS.accent};
      resize: both;
      overflow: hidden;
    `;

    // Make UI draggable
    this.makeDraggable();

    // Add UI components
    this.addHeader();
    if (!this.uiSettings.isCollapsed) {
      this.addStats();
      this.addButtons();
    }

    document.body.appendChild(this.ui);
  }

  // 🖱️ Make UI draggable
  makeDraggable() {
    let isDragging = false;
    let offsetX, offsetY;

    this.ui.addEventListener("mousedown", (e) => {
      if (e.target.tagName !== "BUTTON") {
        isDragging = true;
        offsetX = e.clientX - this.ui.getBoundingClientRect().left;
        offsetY = e.clientY - this.ui.getBoundingClientRect().top;
        this.ui.style.cursor = "grabbing";
      }
    });

    document.addEventListener("mousemove", (e) => {
      if (isDragging) {
        this.ui.style.left = `${e.clientX - offsetX}px`;
        this.ui.style.top = `${e.clientY - offsetY}px`;
      }
    });

    document.addEventListener("mouseup", () => {
      if (isDragging) {
        isDragging = false;
        this.ui.style.cursor = "";
        this.uiSettings.lastPosition = {
          x: parseInt(this.ui.style.left),
          y: parseInt(this.ui.style.top)
        };
        this.memory.save("UI_SETTINGS", this.uiSettings);
      }
    });
  }

  // 🔝 Add header with collapse button
  addHeader() {
    const header = document.createElement("div");
    header.style.cssText = `
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: ${this.uiSettings.isCollapsed ? "0" : "10px"};
    `;

    const title = document.createElement("h3");
    title.textContent = "AI Memory Keeper";
    title.style.cssText = `
      margin: 0;
      font-size: 14px;
      color: ${UI_COLORS.text};
    `;

    const collapseBtn = document.createElement("button");
    collapseBtn.textContent = this.uiSettings.isCollapsed ? ">" : "−";
    collapseBtn.style.cssText = `
      background: transparent;
      border: none;
      color: ${UI_COLORS.text};
      cursor: pointer;
      font-size: 16px;
      padding: 2px 8px;
    `;
    collapseBtn.addEventListener("click", () => {
      this.uiSettings.isCollapsed = !this.uiSettings.isCollapsed;
      this.ui.style.width = this.uiSettings.isCollapsed ? "40px" : "300px";
      collapseBtn.textContent = this.uiSettings.isCollapsed ? ">" : "−";
      this.memory.save("UI_SETTINGS", this.uiSettings);
      this.refreshUI();
    });

    header.appendChild(this.uiSettings.isCollapsed ? collapseBtn : title);
    header.appendChild(this.uiSettings.isCollapsed ? null : collapseBtn);
    this.ui.appendChild(header);
  }

  // 📊 Add stats display
  addStats() {
    this.statsContainer = document.createElement("div");
    this.statsContainer.style.cssText = `
      font-size: 13px;
      margin-bottom: 12px;
      line-height: 1.5;
    `;
    this.ui.appendChild(this.statsContainer);
    this.updateStats();
  }

  // 🛠️ Add action buttons
  addButtons() {
    const btnContainer = document.createElement("div");
    btnContainer.style.cssText = `
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 6px;
    `;

    const buttons = [
      { text: "💾 Save", color: UI_COLORS.success, action: () => this.saveChat() },
      { text: "🔄 Load", color: UI_COLORS.accent, action: () => this.loadChat() },
      { text: "❌ Wipe", color: UI_COLORS.danger, action: () => this.wipeChat() },
      { text: "📤 Export", color: UI_COLORS.warning, action: () => this.exportChat() },
      { text: "📥 Import", color: UI_COLORS.secondary, action: () => this.importChat() },
      { text: "⚙️ Settings", color: UI_COLORS.text, action: () => this.openSettings() }
    ];

    buttons.forEach(btn => {
      const button = document.createElement("button");
      button.textContent = btn.text;
      button.style.cssText = `
        background: ${btn.color};
        color: white;
        border: none;
        border-radius: 4px;
        padding: 6px;
        cursor: pointer;
        transition: all 0.2s;
        font-size: 12px;
      `;
      button.addEventListener("mouseover", () => {
        button.style.opacity = "0.9";
        button.style.transform = "scale(1.02)";
      });
      button.addEventListener("mouseout", () => {
        button.style.opacity = "1";
        button.style.transform = "scale(1)";
      });
      button.addEventListener("click", btn.action);
      btnContainer.appendChild(button);
    });

    this.ui.appendChild(btnContainer);
  }

  // 🔄 Refresh UI (after collapse/toggle)
  refreshUI() {
    this.ui.innerHTML = "";
    this.addHeader();
    if (!this.uiSettings.isCollapsed) {
      this.addStats();
      this.addButtons();
    }
  }

  // 📈 Update stats display
  async updateStats() {
    const data = await this.memory.load("CHAT_DATA");
    this.statsContainer.innerHTML = `
      <strong>Chat Stats</strong><br>
      📅 Last Saved: <em>${data?.timestamp || "Never"}</em><br>
      💬 Messages: <em>${data?.history?.length || 0}</em><br>
      🔒 Storage: <em>${STORAGE_MODE}</em>
    `;
  }

  /* -------------------------------
     SECTION 4: CORE FUNCTIONALITY
     ------------------------------- */
  // 💾 Save current chat
  async saveChat() {
    const messages = [...document.querySelectorAll('[class*="message"], .msg, .content')]
      .filter(el => el.innerText.trim().length > 10)
      .map(el => el.innerText);

    if (messages.length > 0) {
      await this.memory.save("CHAT_DATA", {
        history: messages,
        timestamp: new Date().toISOString()
      });
      this.updateStats();
      GM_notification({
        title: "Chat Saved",
        text: `${messages.length} messages stored`,
        highlight: true
      });
    } else {
      alert("No valid messages found!");
    }
  }

  // 🔄 Load saved chat
  async loadChat() {
    const data = await this.memory.load("CHAT_DATA");
    if (data) {
      alert(`Loaded ${data.history.length} messages from ${new Date(data.timestamp).toLocaleString()}`);
      this.updateStats();
    } else {
      alert("No saved data found!");
    }
  }

  // 🗑️ Wipe saved data
  async wipeChat() {
    if (confirm("Delete ALL saved chats?")) {
      await this.memory.wipe("CHAT_DATA");
      this.updateStats();
      GM_notification({
        title: "Data Wiped",
        text: "All chat history deleted",
        highlight: true
      });
    }
  }

  // 📥 Export to JSON file
  async exportChat() {
    const data = await this.memory.load("CHAT_DATA");
    if (data) {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      GM_download({
        url: url,
        name: `deepseek_chat_${new Date().toISOString().replace(/[:.]/g, "-")}.json`,
        saveAs: true
      });
    } else {
      alert("Nothing to export!");
    }
  }

  // 📤 Import from JSON file
  async importChat() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const data = JSON.parse(e.target.result);
          if (data.history) {
            await this.memory.save("CHAT_DATA", data);
            this.updateStats();
            GM_notification({
              title: "Import Successful",
              text: `${data.history.length} messages loaded`,
              highlight: true
            });
          } else {
            throw new Error("Invalid format");
          }
        } catch (err) {
          alert(`Import failed: ${err.message}`);
        }
      };
      reader.readAsText(file);
    };
    input.click();
  }

  // ⚙️ Open settings panel
  openSettings() {
    // Advanced: Add UI for changing STORAGE_MODE, colors, etc.
    alert("Settings panel would go here!\nEdit the script header for configuration.");
  }
}

/* -------------------------------
   SECTION 5: INITIALIZATION
   ------------------------------- */
// Wait for DOM, then launch UI
(function() {
  'use strict';
  window.addEventListener("load", () => {
    // Inject custom CSS
    GM_addStyle(`
      #deepseek-memory-ui button:hover {
        filter: brightness(1.1);
      }
      #deepseek-memory-ui::-webkit-resizer {
        background: ${UI_COLORS.accent};
      }
    `);

    // Initialize UI
    new UIBuilder();

    // Register Tampermonkey menu commands
    GM_registerMenuCommand("Save Current Chat", () => new UIBuilder().saveChat());
    GM_registerMenuCommand("Open Memory Keeper", () => new UIBuilder().initUI());
  });
})();
