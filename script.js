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
      notifications: document.getElementById("notifications"),
    };

    this.validationTimers = {
      text: null,
      key: null,
    };

    this.attachEventListeners();
    this.updateUI();
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
    };

    this.els.key.oninput = () => {
      this.validateKeyInput();
    };
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
      const rightPadded = right.padStart(32, "0").slice(0, 32);
      const roundKeyPadded = roundKey.padStart(32, "0").slice(0, 32);

      return this.xor(rightPadded, roundKeyPadded);
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

      const f = this.fFunction(right, key, round);
      const newLeft = right;
      const newRight = this.xor(left, f);

      [left, right] = [newLeft, newRight];
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
      this.showNotification("Enter text and key", "error");
      return;
    }

    this.setProcessing(true);

    try {
      await new Promise((r) => setTimeout(r, 300));
      const start = performance.now();

      const result = await this.processText(text, key, rounds, isEncrypt);

      this.els.result.value = result;
    } catch (e) {
      this.showNotification("Error: " + e.message, "error");
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

  clear() {
    this.els.plaintext.value = this.els.key.value = this.els.result.value = "";
    this.els.rounds.value = "4";
    // this.els.encryptMode.checked = true;
    this.els.fileInput.value = "";
    this.els.keyInput.value = "";
    this.updateUI();
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

  createZvhFile(encryptedData, metadata) {
    const header = new Uint8Array([0x5a, 0x56, 0x48, 0x01]); // "ZVH" + версія

    const metadataStr = JSON.stringify(metadata);
    const metadataBytes = new TextEncoder().encode(metadataStr);
    const metadataLength = new Uint32Array([metadataBytes.length]);

    const encryptedBytes = new TextEncoder().encode(encryptedData);
    const dataLength = new Uint32Array([encryptedBytes.length]);

    const totalSize =
      header.length + 4 + metadataBytes.length + 4 + encryptedBytes.length;
    const result = new Uint8Array(totalSize);

    let offset = 0;

    result.set(header, offset);
    offset += header.length;

    result.set(new Uint8Array(metadataLength.buffer), offset);
    offset += 4;

    result.set(metadataBytes, offset);
    offset += metadataBytes.length;

    result.set(new Uint8Array(dataLength.buffer), offset);
    offset += 4;

    result.set(encryptedBytes, offset);

    return result;
  }

  parseZvhFile(arrayBuffer) {
    const data = new Uint8Array(arrayBuffer);
    let offset = 0;

    if (data.length < 12) {
      throw new Error("File too small to be a valid ZVH file");
    }

    const header = data.slice(0, 4);
    if (header[0] !== 0x5a || header[1] !== 0x56 || header[2] !== 0x48) {
      throw new Error("Invalid ZVH file format: wrong magic number");
    }

    const version = header[3];
    if (version !== 0x01) {
      throw new Error(`Unsupported ZVH file version: ${version}`);
    }

    offset = 4;

    if (offset + 4 > data.length) {
      throw new Error("Invalid ZVH file: incomplete metadata length");
    }

    const metadataLength = new DataView(data.buffer, offset, 4).getUint32(
      0,
      true
    );
    offset += 4;

    if (metadataLength > 1024 * 1024 || metadataLength === 0) {
      throw new Error("Invalid metadata length in ZVH file");
    }

    if (offset + metadataLength > data.length) {
      throw new Error("Invalid ZVH file: incomplete metadata");
    }

    const metadataBytes = data.slice(offset, offset + metadataLength);
    let metadata;

    try {
      const metadataStr = new TextDecoder().decode(metadataBytes);
      metadata = JSON.parse(metadataStr);
    } catch (e) {
      throw new Error("Invalid ZVH file: corrupted metadata");
    }

    if (!metadata.version) {
      throw new Error("Invalid ZVH file: missing required metadata fields");
    }

    offset += metadataLength;

    if (offset + 4 > data.length) {
      throw new Error("Invalid ZVH file: incomplete data length");
    }

    const dataLength = new DataView(data.buffer, offset, 4).getUint32(0, true);
    offset += 4;

    if (dataLength > 10 * 1024 * 1024 || dataLength === 0) {
      throw new Error("Invalid data length in ZVH file");
    }

    if (offset + dataLength > data.length) {
      throw new Error("Invalid ZVH file: incomplete encrypted data");
    }

    const encryptedBytes = data.slice(offset, offset + dataLength);
    let encryptedData;

    try {
      encryptedData = new TextDecoder().decode(encryptedBytes);
    } catch (e) {
      throw new Error("Invalid ZVH file: corrupted encrypted data");
    }

    const base64Pattern = /^[A-Za-z0-9+/]+=*$/;
    if (!base64Pattern.test(encryptedData)) {
      throw new Error(
        "Invalid ZVH file: encrypted data is not in base64 format"
      );
    }

    return { metadata, encryptedData };
  }

  downloadEncryptedFile(encryptedData, key, rounds, functionType) {
    try {
      const metadata = {
        version: "1.0",
        timestamp: new Date().toISOString(),
      };

      const zvhData = this.createZvhFile(encryptedData, metadata);

      const blob = new Blob([zvhData], { type: "application/octet-stream" });
      const url = window.URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = url;
      link.download = `encrypted_${Date.now()}.zvh`;
      link.style.display = "none";

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      window.URL.revokeObjectURL(url);

      this.showNotification("Downloaded encrypted ZVH file", "success");
    } catch (error) {
      this.showNotification(
        "Failed to create ZVH file: " + error.message,
        "error"
      );
      console.error("ZVH creation error:", error);
    }
  }

  handleDownload() {
    const result = this.els.result.value.trim();

    if (!result) {
      this.showNotification("No result to download", "error");
      return;
    }

    try {
      const isEncrypt = this.isEncryptMode;

      if (isEncrypt) {
        const key = this.els.key.value.trim();
        const rounds = parseInt(this.els.rounds.value);
        const functionType = this.currentFunctionType;

        this.downloadEncryptedFile(result, key, rounds, functionType);
      } else {
        const filename = "decrypted_result.txt";
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
      }
    } catch (error) {
      this.showNotification("Failed to download file", "error");
      console.error("Download error:", error);
    }
  }

  handleZvhFileLoad(file) {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const arrayBuffer = e.target.result;
        const { metadata, encryptedData } = this.parseZvhFile(arrayBuffer);

        if (this.isEncryptMode) {
          this.showNotification(
            "Switch to Decrypt mode to load ZVH files",
            "error"
          );
          return;
        }

        this.els.plaintext.value = encryptedData;

        this.showNotification(`Loaded ZVH file: ${file.name}`, "success");
      } catch (error) {
        this.showNotification(
          "Failed to load ZVH file: " + error.message,
          "error"
        );
        console.error("ZVH loading error:", error);
      }
    };

    reader.onerror = () => {
      this.showNotification("Failed to read ZVH file", "error");
    };

    reader.readAsArrayBuffer(file);
  }

  handleFileLoad(event) {
    const file = event.target.files[0];
    if (!file) return;

    const fileName = file.name.toLowerCase();

    if (fileName.endsWith(".zvh")) {
      this.handleZvhFileLoad(file);
      event.target.value = "";
      return;
    }

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
