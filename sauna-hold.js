(() => {
  // Allow each ESPHome output pulse to finish and the keypad to see a release.
  // Set this to at least the longest adjustment pulse plus 150 ms.
  const repeatMs = 450;
  const firstRepeatMs = 500;
  const labels = ["Temp +", "Temp -", "Time +", "Time -"];

  function mount() {
    const panel = document.createElement("section");
    panel.setAttribute("aria-label", "Sauna adjustments");
    panel.style.cssText = "box-sizing:border-box;max-width:42rem;margin:1rem auto;padding:1rem;background:#f5f5f5;color:#171717;border:1px solid #ccc;border-radius:.6rem;font:16px system-ui";
    const title = document.createElement("strong");
    title.textContent = "Sauna adjustments";
    const hint = document.createElement("p");
    hint.textContent = "Tap for one step. Hold to repeat.";
    const controls = document.createElement("div");
    controls.style.cssText = "display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:.5rem";
    const status = document.createElement("p");
    status.setAttribute("role", "status");
    status.style.marginBottom = "0";
    panel.append(title, hint, controls, status);
    document.body.prepend(panel);

    let hold = null;
    let busy = false;
    let nextPress = 0;
    function stop() {
      if (!hold) return;
      clearTimeout(hold.timer);
      hold = null;
    }

    async function press(label) {
      if (busy || performance.now() < nextPress) return true;
      busy = true;
      status.textContent = "";
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3000);
      try {
        const response = await fetch("/button/" + encodeURIComponent(label) + "/press", {
          method: "POST",
          credentials: "same-origin",
          signal: controller.signal
        });
        if (!response.ok) throw new Error("HTTP " + response.status);
        return true;
      } catch (error) {
        status.textContent = label + " command failed (" + error.message + ").";
        stop();
        return false;
      } finally {
        clearTimeout(timeout);
        busy = false;
        nextPress = performance.now() + repeatMs;
      }
    }

    async function repeat(session) {
      if (hold !== session) return;
      if (!(await press(session.label)) || hold !== session) return;
      session.timer = setTimeout(() => repeat(session),
        Math.max(10, Math.ceil(nextPress - performance.now())));
    }

    for (const label of labels) {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = label;
      button.style.cssText = "min-height:3rem;font:600 1rem system-ui;touch-action:none;user-select:none;-webkit-user-select:none;cursor:pointer";
      button.addEventListener("pointerdown", event => {
        if (event.button !== 0 || !event.isPrimary || hold) return;
        const session = { label, pointerId: event.pointerId };
        button.setPointerCapture(event.pointerId);
        hold = session;
        session.timer = setTimeout(() => repeat(session), firstRepeatMs);
        void press(label);
      });
      for (const eventName of ["pointerup", "pointercancel", "lostpointercapture"]) {
        button.addEventListener(eventName, event => {
          if (hold?.pointerId === event.pointerId) stop();
        });
      }
      button.addEventListener("contextmenu", event => event.preventDefault());
      button.addEventListener("click", event => {
        // Mouse and touch already sent their first press on pointerdown.
        if (event.detail === 0 && !event.pointerType) void press(label);
      });
      controls.append(button);
    }
    window.addEventListener("blur", stop);
    window.addEventListener("pagehide", stop);
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) stop();
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mount, { once: true });
  } else {
    mount();
  }
})();
