class FeistelCipher {
  constructor() {
    this.els = {
      plaintext: document.getElementById("plaintext"),
      key: document.getElementById("key"),
      rounds: document.getElementById("rounds"),
      result: document.getElementById("result"),
      encryptMode: document.getElementById("encryptMode"),
      decryptMode: document.getElementById("decryptMode"),
      functionSimple: document.getElementById("functionSimple"),
      functionComplex: document.getElementById("functionComplex"),
      process: document.getElementById("processBtn"),
      clear: document.getElementById("clearBtn"),
      loadFile: document.getElementById("loadFileBtn"),
      fileInput: document.getElementById("fileInput"),
      loadKey: document.getElementById("loadKeyBtn"),
      keyInput: document.getElementById("keyInput"),
      downloadBtn: document.getElementById("downloadBtn"),
      viz: document.getElementById("visualization"),
      notifications: document.getElementById("notifications"),
      stats: {
        input: document.getElementById("inputLength"),
        output: document.getElementById("outputLength"),
        rounds: document.getElementById("roundsUsed"),
        time: document.getElementById("processingTime"),
      },
    };

    this.validationTimers = {
      text: null,
      key: null,
    };

    this.attachEventListeners();
    this.updateUI();
    this.updateStats();
  }

  attachEventListeners() {
    this.els.process.onclick = () => this.handleProcess();
    this.els.clear.onclick = () => this.clear();
    this.els.loadFile.onclick = () => this.els.fileInput.click();
    this.els.fileInput.onchange = (e) => this.handleFileLoad(e);
    this.els.loadKey.onclick = () => this.els.keyInput.click();
    this.els.keyInput.onchange = (e) => this.handleKeyLoad(e);
    this.els.downloadBtn.onclick = () => this.handleDownload();

    [this.els.encryptMode, this.els.decryptMode].forEach(
      (radio) => (radio.onchange = () => this.updateUI())
    );

    this.els.plaintext.oninput = () => {
      this.validateTextInput();
      this.updateStats();
    };

    this.els.key.oninput = () => {
      this.validateKeyInput();
      this.updateStats();
    };

    this.els.rounds.oninput = () => this.updateStats();
  }

  get currentMode() {
    return this.els.encryptMode.checked ? "encrypt" : "decrypt";
  }

  get isEncryptMode() {
    return this.currentMode === "encrypt";
  }

  get currentFunctionType() {
    return this.els.functionSimple.checked ? "simple" : "complex";
  }

  get isSimpleFunction() {
    return this.currentFunctionType === "simple";
  }

  updateUI() {
    const isEncrypt = this.isEncryptMode;
    this.els.plaintext.placeholder = isEncrypt
      ? "Enter text or load file to encrypt..."
      : "Enter text or load file to decrypt...";

    this.els.plaintext.readOnly = !isEncrypt;
    this.els.plaintext.style.cursor = isEncrypt ? "text" : "default";
    this.els.loadFile.textContent = isEncrypt ? "Load File" : "Load File";

    if (!isEncrypt) {
      this.els.plaintext.placeholder = "Load file to decrypt...";
    }
  }

  validateTextInput() {
    clearTimeout(this.validationTimers.text);

    this.validationTimers.text = setTimeout(() => {
      const text = this.els.plaintext.value;
      if (!text) return;

      const latinPattern =
        /^[a-zA-Z0-9\s.,!?;:'"()\-_+=\/@#$%^&*\[\]{}|\\`~<>]*$/;

      if (!latinPattern.test(text)) {
        this.showNotification(
          "Text must contain only Latin characters",
          "error"
        );
        this.els.plaintext.value = text.replace(
          /[^a-zA-Z0-9\s.,!?;:'"()\-_+=\/@#$%^&*\[\]{}|\\`~<>]/g,
          ""
        );
      }
    }, 500);
  }

  validateKeyInput() {
    clearTimeout(this.validationTimers.key);

    this.validationTimers.key = setTimeout(() => {
      const key = this.els.key.value;
      if (!key) return;

      const binaryPattern = /^[01]*$/;

      if (!binaryPattern.test(key)) {
        this.showNotification(
          "Key must contain only binary digits (0, 1)",
          "error"
        );
        this.els.key.value = key.replace(/[^01]/g, "");
      }

      if (key.length > 0 && key.length < 8) {
        this.showNotification("Key should be at least 8 bits long", "error");
      }
    }, 500);
  }

  stringToBinary(str) {
    return str
      .split("")
      .map((c) => c.charCodeAt(0).toString(2).padStart(8, "0"))
      .join("");
  }

  binaryToString(binary) {
    const cleanBinary = binary.replace(/[^01]/g, "");
    const paddedBinary = cleanBinary.padEnd(
      Math.ceil(cleanBinary.length / 8) * 8,
      "0"
    );

    if (paddedBinary.length === 0) return "";

    try {
      return (
        paddedBinary
          .match(/.{8}/g)
          ?.map((b) => {
            const charCode = parseInt(b, 2);
            return charCode >= 0 && charCode <= 255
              ? String.fromCharCode(charCode)
              : "";
          })
          .join("") || ""
      );
    } catch (error) {
      console.error("Error converting binary to string:", error);
      return "";
    }
  }

  xor(a, b) {
    const len = Math.max(a.length, b.length);
    a = a.padStart(len, "0");
    b = b.padStart(len, "0");
    return a
      .split("")
      .map((bit, i) => (bit === b[i] ? "0" : "1"))
      .join("");
  }

  rotateLeft(binary, pos) {
    pos %= binary.length;
    return binary.slice(pos) + binary.slice(0, pos);
  }

  fFunction(right, key, round, leftPart = null) {
    const keyBin = this.stringToBinary(key);

    const roundKey = this.generateRoundKey(keyBin, round, 32);

    if (this.isSimpleFunction) {
      // а) функция F - одинична, тобто F(Vi) = Vi
      return roundKey;
    } else {
      // б) функция має вигляд F(Vi, X) = S(X) ⊕ Vi
      if (!leftPart) {
        throw new Error("Left part required for complex F function");
      }

      const leftPadded = leftPart.padStart(32, "0").slice(0, 32);
      const roundKeyPadded = roundKey.padStart(32, "0").slice(0, 32);

      return this.xor(leftPadded, roundKeyPadded);
    }
  }

  generateRoundKey(keyBinary, round, length) {
    let roundKey = "";
    const keyLength = keyBinary.length;

    for (let i = 0; i < length; i++) {
      const position = (round + i) % keyLength;
      roundKey += keyBinary[position];
    }

    return roundKey;
  }

  padText(text) {
    const blockSize = 8;
    const pad = blockSize - (text.length % blockSize);

    const paddingSize = pad === 0 ? blockSize : pad;

    return text + String.fromCharCode(paddingSize).repeat(paddingSize);
  }

  removePadding(text) {
    if (!text || text.length === 0) return text;

    const lastByte = text.charCodeAt(text.length - 1);

    if (lastByte > 8 || lastByte <= 0) return text;

    for (let i = 1; i <= lastByte; i++) {
      if (text.charCodeAt(text.length - i) !== lastByte) {
        return text;
      }
    }

    return text.slice(0, -lastByte);
  }

  processBlock(block, key, rounds, encrypt) {
    const binary = this.stringToBinary(block);

    const paddedBinary = binary.padEnd(64, "0");

    let [left, right] = [paddedBinary.slice(0, 32), paddedBinary.slice(32, 64)];

    for (let i = 0; i < rounds; i++) {
      const round = encrypt ? i : rounds - 1 - i;

      left = left.padStart(32, "0").slice(0, 32);
      right = right.padStart(32, "0").slice(0, 32);

      const f = this.fFunction(right, key, round, left);
      const newLeft = right;
      const newRight = this.xor(left, f);

      [left, right] = [newLeft, newRight];

      this.visualize(i + 1, left, right, rounds);
    }

    const finalLeft = right.padStart(32, "0").slice(0, 32);
    const finalRight = left.padStart(32, "0").slice(0, 32);
    const finalBinary = finalLeft + finalRight;

    return this.binaryToString(finalBinary);
  }

  async handleProcess() {
    const text = this.els.plaintext.value.trim();
    const key = this.els.key.value.trim();
    const rounds = parseInt(this.els.rounds.value);
    const isEncrypt = this.isEncryptMode;

    if (!text || !key) {
      this.showMessage("Enter text and key");
      return;
    }

    this.setProcessing(true);
    this.showMessage(isEncrypt ? "Encrypting..." : "Decrypting...");

    try {
      await new Promise((r) => setTimeout(r, 300));
      const start = performance.now();

      const result = await this.processText(text, key, rounds, isEncrypt);
      const processingTime = performance.now() - start;

      this.els.result.value = result;
      this.updateStats(text.length, result.length, rounds, processingTime);

      setTimeout(() => this.showMessage("Complete"), rounds * 150 + 300);
    } catch (e) {
      this.showMessage("Error: " + e.message);
    } finally {
      this.setProcessing(false);
    }
  }

  async processText(text, key, rounds, encrypt) {
    let result = "";

    if (encrypt) {
      const padded = this.padText(text);
      for (let i = 0; i < padded.length; i += 8) {
        result += this.processBlock(padded.slice(i, i + 8), key, rounds, true);
      }
      return btoa(result);
    } else {
      const decoded = atob(text);
      for (let i = 0; i < decoded.length; i += 8) {
        result += this.processBlock(
          decoded.slice(i, i + 8),
          key,
          rounds,
          false
        );
      }
      return this.removePadding(result);
    }
  }

  visualize(round, left, right, total) {
    setTimeout(() => {
      const functionType = this.isSimpleFunction ? "F(Vi)" : "F(Vi,X)";
      this.els.viz.innerHTML = `
        <div class="feistel-round">
          <div class="data-block"><div>L${round - 1}</div><div>${left.slice(
        0,
        6
      )}...</div></div>
          <div class="function-box">${functionType}</div>
          <div class="xor-symbol">⊕</div>
          <div class="data-block"><div>R${round - 1}</div><div>${right.slice(
        0,
        6
      )}...</div></div>
          <div style="margin-left: 15px; font-size: 0.75rem; color: var(--text-muted);">${round}/${total}</div>
        </div>`;
    }, round * 150);
  }

  clear() {
    this.els.plaintext.value = this.els.key.value = this.els.result.value = "";
    this.els.rounds.value = "4";
    // this.els.encryptMode.checked = true;
    this.els.fileInput.value = "";
    this.els.keyInput.value = "";
    this.updateUI();
    this.showMessage("Ready");
    this.updateStats();
  }

  updateStats(inputLen = 0, outputLen = 0, rounds = 0, time = 0) {
    this.els.stats.input.textContent =
      inputLen || this.els.plaintext.value.length;
    this.els.stats.output.textContent =
      outputLen || this.els.result.value.length;
    this.els.stats.rounds.textContent = rounds || this.els.rounds.value;
    this.els.stats.time.textContent = time ? `${time.toFixed(2)}ms` : "0ms";
  }

  showMessage(msg) {
    this.els.viz.innerHTML = `<div class="round-display"><div class="round-info">${msg}</div></div>`;
  }

  setProcessing(processing) {
    [this.els.process, this.els.clear].forEach((btn) => {
      btn.disabled = processing;
      btn.classList.toggle("processing", processing);
    });

    [
      this.els.encryptMode,
      this.els.decryptMode,
      this.els.functionSimple,
      this.els.functionComplex,
    ].forEach((radio) => {
      radio.disabled = processing;
    });
    this.els.loadFile.disabled = processing;
    this.els.loadKey.disabled = processing;
    this.els.downloadBtn.disabled = processing;
  }

  handleDownload() {
    const result = this.els.result.value.trim();

    if (!result) {
      this.showNotification("No result to download", "error");
      return;
    }

    try {
      const isEncrypt = this.isEncryptMode;
      const filename = isEncrypt
        ? "encrypted_result.txt"
        : "decrypted_result.txt";

      const blob = new Blob([result], { type: "text/plain;charset=utf-8" });
      const url = window.URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      link.style.display = "none";

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      window.URL.revokeObjectURL(url);

      this.showNotification(`Downloaded ${filename}`, "success");
    } catch (error) {
      this.showNotification("Failed to download file", "error");
      console.error("Download error:", error);
    }
  }

  handleFileLoad(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target.result;

      if (!content.trim()) {
        this.showNotification("File is empty", "error");
        return;
      }

      const latinPattern =
        /^[a-zA-Z0-9\s.,!?;:'"()\-_+=\/@#$%^&*\[\]{}|\\`~<>]*$/;
      if (!latinPattern.test(content)) {
        this.showNotification(
          "File contains non-Latin characters. Only Latin characters are allowed.",
          "error"
        );
        return;
      }

      this.els.plaintext.value = content;
      this.updateStats();
      this.showNotification(`Loaded ${file.name}`, "success");
    };

    reader.onerror = () => {
      this.showNotification("Failed to read file", "error");
    };

    reader.readAsText(file);
    event.target.value = "";
  }

  handleKeyLoad(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target.result.trim();

      if (!content) {
        this.showNotification("Key file is empty", "error");
        return;
      }

      const cleanKey = content.replace(/\s+/g, "");

      if (!cleanKey) {
        this.showNotification("Key file contains only whitespace", "error");
        return;
      }

      const binaryPattern = /^[01]*$/;
      if (!binaryPattern.test(cleanKey)) {
        this.showNotification(
          "Key file must contain only binary digits (0, 1)",
          "error"
        );
        return;
      }

      if (cleanKey.length < 8) {
        this.showNotification("Key should be at least 8 bits long", "error");
        return;
      }

      this.els.key.value = cleanKey;
      this.updateStats();
      this.showNotification(`Loaded key from ${file.name}`, "success");
    };

    reader.onerror = () => {
      this.showNotification("Failed to read key file", "error");
    };

    reader.readAsText(file);
    event.target.value = "";
  }

  showNotification(message, type = "info") {
    const notification = document.createElement("div");
    notification.className = `notification ${type}`;
    notification.textContent = message;

    this.els.notifications.appendChild(notification);

    setTimeout(() => notification.classList.add("show"), 10);

    setTimeout(() => {
      notification.classList.remove("show");
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 300);
    }, 3000);
  }
}

document.addEventListener("DOMContentLoaded", () => new FeistelCipher());
