class AvalancheResearch {
  constructor() {
    this.els = {
      originalText: document.getElementById("originalText"),
      originalKey: document.getElementById("originalKey"),
      bitPosition: document.getElementById("bitPosition"),
      changeText: document.getElementById("changeText"),
      changeKey: document.getElementById("changeKey"),
      rounds: document.getElementById("rounds"),
      functionType: document.getElementById("functionType"),
      startResearch: document.getElementById("startResearchBtn"),
      clearResults: document.getElementById("clearResultsBtn"),
      exportData: document.getElementById("exportDataBtn"),
      backBtn: document.getElementById("backBtn"),
      roundResults: document.getElementById("roundResults"),
      notifications: document.getElementById("notifications"),
      summaryStats: {
        totalBits: document.getElementById("totalBits"),
        avgChanged: document.getElementById("avgChanged"),
        maxChanged: document.getElementById("maxChanged"),
        minChanged: document.getElementById("minChanged"),
        avalancheRatio: document.getElementById("avalancheRatio"),
      },
    };

    this.researchData = [];
    this.chart = null;
    this.cipher = new FeistelCipher();

    this.initializeFromParams();
    this.attachEventListeners();
  }

  initializeFromParams() {
    const urlParams = new URLSearchParams(window.location.search);

    this.els.originalText.value = urlParams.get("text") || "";
    this.els.originalKey.value = urlParams.get("key") || "";
    this.els.rounds.value = urlParams.get("rounds") || "4";
    this.els.functionType.value =
      urlParams.get("functionType") === "simple"
        ? "F(Vi) = Vi"
        : "F(Vi, X) = S(X) ⊕ Vi";

    const text = this.els.originalText.value;
    if (text) {
      const maxBits = text.length * 8;
      this.els.bitPosition.max = maxBits;
      this.els.bitPosition.placeholder = `1-${maxBits}`;
    }
  }

  attachEventListeners() {
    this.els.startResearch.onclick = () => this.startResearch();
    this.els.clearResults.onclick = () => this.clearResults();
    this.els.exportData.onclick = () => this.exportData();
    this.els.backBtn.onclick = () => window.close();

    this.els.changeText.onchange = () => this.updateBitPositionMax();
    this.els.changeKey.onchange = () => this.updateBitPositionMax();
  }

  updateBitPositionMax() {
    const isTextTarget = this.els.changeText.checked;
    const target = isTextTarget
      ? this.els.originalText.value
      : this.els.originalKey.value;
    const maxBits = target.length * 8;
    this.els.bitPosition.max = maxBits;
    this.els.bitPosition.placeholder = `1-${maxBits}`;
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

  generateRoundKey(keyBinary, round, length) {
    let roundKey = "";
    const keyLength = keyBinary.length;

    for (let i = 0; i < length; i++) {
      const position = (round + i) % keyLength;
      roundKey += keyBinary[position];
    }

    return roundKey;
  }

  fFunction(right, key, round, isSimple) {
    const keyBin = this.stringToBinary(key);
    const roundKey = this.generateRoundKey(keyBin, round, 32);

    if (isSimple) {
      return roundKey;
    } else {
      const rightPadded = right.padStart(32, "0").slice(0, 32);
      const roundKeyPadded = roundKey.padStart(32, "0").slice(0, 32);
      return this.xor(rightPadded, roundKeyPadded);
    }
  }

  padText(text) {
    const blockSize = 8;
    const pad = blockSize - (text.length % blockSize);
    const paddingSize = pad === 0 ? blockSize : pad;
    return text + String.fromCharCode(paddingSize).repeat(paddingSize);
  }

  processBlockWithRoundTracking(block, key, rounds, isSimple) {
    const binary = this.stringToBinary(block);
    const paddedBinary = binary.padEnd(64, "0");
    let [left, right] = [paddedBinary.slice(0, 32), paddedBinary.slice(32, 64)];

    const roundStates = [];

    for (let i = 0; i < rounds; i++) {
      left = left.padStart(32, "0").slice(0, 32);
      right = right.padStart(32, "0").slice(0, 32);

      const f = this.fFunction(right, key, i, isSimple);
      const newLeft = right;
      const newRight = this.xor(left, f);

      [left, right] = [newLeft, newRight];

      const finalLeft = right.padStart(32, "0").slice(0, 32);
      const finalRight = left.padStart(32, "0").slice(0, 32);
      const roundResult = finalLeft + finalRight;
      roundStates.push(roundResult);
    }

    return roundStates;
  }

  changeBitInString(str, bitPosition) {
    const binary = this.stringToBinary(str);
    if (bitPosition < 1 || bitPosition > binary.length) {
      throw new Error(
        `Bit position ${bitPosition} is out of range (1-${binary.length})`
      );
    }

    const bitArray = binary.split("");
    const index = bitPosition - 1;
    bitArray[index] = bitArray[index] === "0" ? "1" : "0";

    return this.binaryToString(bitArray.join(""));
  }

  countChangedBits(binary1, binary2) {
    const len = Math.max(binary1.length, binary2.length);
    const padded1 = binary1.padStart(len, "0");
    const padded2 = binary2.padStart(len, "0");

    let changedBits = 0;
    for (let i = 0; i < len; i++) {
      if (padded1[i] !== padded2[i]) {
        changedBits++;
      }
    }

    return changedBits;
  }

  async startResearch() {
    const text = this.els.originalText.value.trim();
    const key = this.els.originalKey.value.trim();
    const bitPosition = parseInt(this.els.bitPosition.value);
    const rounds = parseInt(this.els.rounds.value);
    const isTextTarget = this.els.changeText.checked;
    const isSimple = this.els.functionType.value.includes("F(Vi) = Vi");

    if (!text || !key) {
      this.showNotification("Original text and key are required", "error");
      return;
    }

    if (!bitPosition || bitPosition < 1) {
      this.showNotification("Please enter a valid bit position", "error");
      return;
    }

    this.els.startResearch.disabled = true;
    this.showNotification("Starting avalanche effect research...", "info");

    try {
      const paddedText = this.padText(text);
      const originalStates = this.processBlockWithRoundTracking(
        paddedText.slice(0, 8),
        key,
        rounds,
        isSimple
      );

      let modifiedText = text;
      let modifiedKey = key;

      if (isTextTarget) {
        modifiedText = this.changeBitInString(text, bitPosition);
      } else {
        modifiedKey = this.changeBitInString(key, bitPosition);
      }

      const paddedModifiedText = this.padText(modifiedText);
      const modifiedStates = this.processBlockWithRoundTracking(
        paddedModifiedText.slice(0, 8),
        modifiedKey,
        rounds,
        isSimple
      );

      this.researchData = [];
      for (let round = 0; round < rounds; round++) {
        const changedBits = this.countChangedBits(
          originalStates[round],
          modifiedStates[round]
        );
        this.researchData.push({
          round: round + 1,
          changedBits: changedBits,
          totalBits: Math.max(
            originalStates[round].length,
            modifiedStates[round].length
          ),
        });
      }

      this.displayResults();
      this.updateChart();
      this.updateSummaryStats();

      this.showNotification("Research completed successfully", "success");
    } catch (error) {
      this.showNotification("Error during research: " + error.message, "error");
      console.error("Research error:", error);
    } finally {
      this.els.startResearch.disabled = false;
    }
  }

  displayResults() {
    this.els.roundResults.innerHTML = "";

    this.researchData.forEach((data) => {
      const roundItem = document.createElement("div");
      roundItem.className = "round-item";
      roundItem.innerHTML = `
        <span class="round-number">Round ${data.round}</span>
        <span class="changed-bits">${data.changedBits} bits changed</span>
      `;
      this.els.roundResults.appendChild(roundItem);
    });
  }

  updateChart() {
    const ctx = document.getElementById("avalancheChart").getContext("2d");

    if (this.chart) {
      this.chart.destroy();
    }

    this.chart = new Chart(ctx, {
      type: "line",
      data: {
        labels: this.researchData.map((d) => `Round ${d.round}`),
        datasets: [
          {
            label: "Changed Bits",
            data: this.researchData.map((d) => d.changedBits),
            borderColor: "#6c5ce7",
            backgroundColor: "rgba(108, 92, 231, 0.1)",
            borderWidth: 2,
            fill: true,
            tension: 0.4,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            labels: {
              color: "#ffffff",
            },
          },
        },
        scales: {
          x: {
            ticks: {
              color: "#666666",
            },
            grid: {
              color: "#1a1a1a",
            },
          },
          y: {
            beginAtZero: true,
            ticks: {
              color: "#666666",
            },
            grid: {
              color: "#1a1a1a",
            },
          },
        },
      },
    });
  }

  updateSummaryStats() {
    if (this.researchData.length === 0) return;

    const changedBitsCounts = this.researchData.map((d) => d.changedBits);
    const totalBits = this.researchData[0].totalBits;

    const avgChanged = (
      changedBitsCounts.reduce((a, b) => a + b, 0) / changedBitsCounts.length
    ).toFixed(1);
    const maxChanged = Math.max(...changedBitsCounts);
    const minChanged = Math.min(...changedBitsCounts);
    const avalancheRatio = ((avgChanged / totalBits) * 100).toFixed(1);

    this.els.summaryStats.totalBits.textContent = totalBits;
    this.els.summaryStats.avgChanged.textContent = avgChanged;
    this.els.summaryStats.maxChanged.textContent = maxChanged;
    this.els.summaryStats.minChanged.textContent = minChanged;
    this.els.summaryStats.avalancheRatio.textContent = `${avalancheRatio}%`;
  }

  clearResults() {
    this.researchData = [];
    this.els.roundResults.innerHTML = "";

    if (this.chart) {
      this.chart.destroy();
      this.chart = null;
    }

    Object.values(this.els.summaryStats).forEach(
      (el) => (el.textContent = "-")
    );

    this.showNotification("Results cleared", "info");
  }

  exportData() {
    if (this.researchData.length === 0) {
      this.showNotification("No data to export", "error");
      return;
    }

    try {
      const csvContent = [
        ["Round", "Changed Bits", "Total Bits", "Change Ratio (%)"],
        ...this.researchData.map((d) => [
          d.round,
          d.changedBits,
          d.totalBits,
          ((d.changedBits / d.totalBits) * 100).toFixed(2),
        ]),
      ]
        .map((row) => row.join(","))
        .join("\n");

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8" });
      const url = window.URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = url;
      link.download = `avalanche_effect_${Date.now()}.csv`;
      link.style.display = "none";

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      window.URL.revokeObjectURL(url);

      this.showNotification("Data exported successfully", "success");
    } catch (error) {
      this.showNotification("Failed to export data", "error");
      console.error("Export error:", error);
    }
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

class FeistelCipher {}

document.addEventListener("DOMContentLoaded", () => new AvalancheResearch());
