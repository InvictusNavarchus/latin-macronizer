export interface StatusOverlay {
  show: () => void;
  hide: () => void;
  updateStatus: (message: string) => void;
  updateProgress: (current: number, total: number, action?: string) => void;
  setCompleted: () => void;
}

export function createStatusOverlay(): StatusOverlay {
  const overlay = document.createElement("div");
  overlay.id = "latin-macronizer-overlay";
  overlay.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    width: min(300px, calc(100vw - 40px));
    max-width: 90vw;
    background: linear-gradient(135deg, #2c3e50, #1a252f);
    border-radius: 12px;
    box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
    color: #ecf0f1;
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    padding: clamp(12px, 3vw, 15px);
    z-index: 9999;
    transition: transform 0.3s ease, opacity 0.3s ease;
    transform: translateY(150%);
    opacity: 0;
  `;

  const style = document.createElement("style");
  style.textContent = `
    @media (max-width: 768px) {
      #latin-macronizer-overlay {
        bottom: 10px !important; right: 10px !important;
        left: 10px !important; width: auto !important;
        max-width: none !important; padding: 12px !important;
      }
    }
    @media (max-width: 480px) {
      #latin-macronizer-overlay { font-size: 14px !important; }
    }
  `;
  document.head.appendChild(style);

  // --- Header ---
  const header = document.createElement("div");
  header.style.cssText = `
    display: flex; align-items: center;
    margin-bottom: 10px; padding-bottom: 8px;
    border-bottom: 1px solid rgba(236, 240, 241, 0.2);
  `;

  const logo = document.createElement("div");
  logo.innerHTML = "Ā";
  logo.style.cssText = `
    font-size: clamp(20px, 5vw, 24px); font-weight: bold;
    background: linear-gradient(135deg, #3498db, #9b59b6);
    -webkit-background-clip: text; -webkit-text-fill-color: transparent;
    margin-right: 10px;
  `;

  const title = document.createElement("div");
  title.textContent = "Latin Macronizer";
  title.style.cssText = `font-size: clamp(14px, 4vw, 16px); font-weight: 600;`;

  const minimizeBtn = document.createElement("div");
  minimizeBtn.innerHTML = "−";
  minimizeBtn.style.cssText = `
    margin-left: auto; cursor: pointer;
    font-size: 18px; font-weight: bold; opacity: 0.8;
    width: clamp(24px, 6vw, 32px); height: clamp(24px, 6vw, 32px);
    display: flex; align-items: center; justify-content: center;
    border-radius: 50%; transition: background-color 0.2s ease;
    touch-action: manipulation;
  `;
  minimizeBtn.addEventListener("mouseover", () => {
    minimizeBtn.style.backgroundColor = "rgba(236, 240, 241, 0.2)";
  });
  minimizeBtn.addEventListener("mouseout", () => {
    minimizeBtn.style.backgroundColor = "transparent";
  });

  header.appendChild(logo);
  header.appendChild(title);
  header.appendChild(minimizeBtn);

  // --- Content ---
  const content = document.createElement("div");
  content.style.cssText = "margin-bottom: 15px;";

  const statusText = document.createElement("div");
  statusText.style.cssText = `
    margin-bottom: 10px; font-size: clamp(12px, 3.5vw, 14px);
    color: #bdc3c7; word-wrap: break-word;
  `;
  statusText.textContent = "Starting...";

  const progressContainer = document.createElement("div");
  progressContainer.style.cssText = "display: flex; flex-direction: column; gap: 5px;";

  const progressLabel = document.createElement("div");
  progressLabel.style.cssText = `
    display: flex; justify-content: space-between;
    font-size: clamp(10px, 3vw, 12px); color: #bdc3c7;
  `;

  const progressAction = document.createElement("span");
  progressAction.textContent = "Processing";

  const progressStats = document.createElement("span");
  progressStats.textContent = "0/0";

  progressLabel.appendChild(progressAction);
  progressLabel.appendChild(progressStats);

  const progressBarTrack = document.createElement("div");
  progressBarTrack.style.cssText = `
    width: 100%; height: clamp(6px, 2vw, 8px);
    border-radius: 4px; background-color: rgba(236, 240, 241, 0.2); overflow: hidden;
  `;

  const progressFill = document.createElement("div");
  progressFill.style.cssText = `
    height: 100%; width: 0%;
    background: linear-gradient(90deg, #3498db, #2ecc71);
    border-radius: 4px; transition: width 0.3s ease;
  `;

  progressBarTrack.appendChild(progressFill);
  progressContainer.appendChild(progressLabel);
  progressContainer.appendChild(progressBarTrack);

  content.appendChild(statusText);
  content.appendChild(progressContainer);

  overlay.appendChild(header);
  overlay.appendChild(content);
  document.body.appendChild(overlay);

  // --- Minimize ---
  let isMinimized = false;

  minimizeBtn.addEventListener("click", () => {
    if (isMinimized) {
      content.style.display = "block";
      minimizeBtn.innerHTML = "−";
      isMinimized = false;
    } else {
      content.style.display = "none";
      minimizeBtn.innerHTML = "+";
      isMinimized = true;
    }
  });

  return {
    show() {
      overlay.style.transform = "translateY(0)";
      overlay.style.opacity = "1";
    },
    hide() {
      overlay.style.transform = "translateY(150%)";
      overlay.style.opacity = "0";
    },
    updateStatus(message) {
      statusText.textContent = message;
    },
    updateProgress(current, total, action = "Processing") {
      const pct = total > 0 ? (current / total) * 100 : 0;
      progressFill.style.width = `${pct}%`;
      progressStats.textContent = `${current}/${total}`;
      progressAction.textContent = action;
    },
    setCompleted() {
      progressFill.style.width = "100%";
      progressFill.style.background = "linear-gradient(90deg, #2ecc71, #27ae60)";
      statusText.textContent = "Macronization complete!";
      setTimeout(() => {
        overlay.style.transform = "translateY(150%)";
        overlay.style.opacity = "0";
      }, 5000);
    },
  };
}