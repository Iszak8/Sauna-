(() => {
  // Custom sauna control panel layered over the ESPHome web_server page.
  // Talks to the same REST endpoints and /events stream as the standard UI,
  // which stays available behind the "Standard controls" link.

  // Allow each ESPHome output pulse to finish and the keypad to see a release.
  // Set this to at least the longest adjustment pulse plus 150 ms.
  const repeatMs = 450;
  const firstRepeatMs = 500;
  // Starting the heater needs a deliberate hold; stopping is a single tap.
  const startHoldMs = 1000;

  const css = `
  :root{--bg:#14100d;--card:#1f1915;--card-2:#2a221c;--line:#3a2f27;--text:#f5ece4;--muted:#b3a497;
    --ember:#ff7a2f;--ember-2:#ffb15c;--on:#4fd18b;--off:#6b5f56;--danger:#ff6b5e;color-scheme:dark}
  html.sx-custom body{background:radial-gradient(120% 60% at 50% 0,#2b1d14 0,var(--bg) 60%) fixed;margin:0}
  html.sx-custom body>esp-app{display:none}
  .sx{box-sizing:border-box;max-width:30rem;margin:0 auto;padding:1rem 1rem 2rem;color:var(--text);
    font:16px/1.4 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;-webkit-tap-highlight-color:transparent}
  .sx *{box-sizing:border-box}
  .sx-head{display:flex;align-items:center;justify-content:space-between;margin:.25rem 0 1rem}
  .sx-head h1{font-size:1.5rem;font-weight:700;letter-spacing:.02em;margin:0}
  .sx-live{display:flex;align-items:center;gap:.4rem;font-size:.85rem;color:var(--muted)}
  .sx-dot{width:.55rem;height:.55rem;border-radius:50%;background:var(--off)}
  .sx-live[data-on="1"] .sx-dot{background:var(--on);box-shadow:0 0 .5rem var(--on)}
  .sx-card{background:linear-gradient(180deg,var(--card-2),var(--card));border:1px solid var(--line);
    border-radius:1.25rem;padding:1.25rem;margin-bottom:.9rem}
  .sx-hero{display:flex;flex-direction:column;align-items:center;text-align:center;padding:1.75rem 1.25rem}
  .sx-power{position:relative;width:9.5rem;height:9.5rem;border-radius:50%;border:0;padding:0;cursor:pointer;
    background:radial-gradient(circle at 50% 35%,#3a2e26,#1c1612);color:var(--muted);
    box-shadow:inset 0 0 0 2px var(--line),0 .75rem 2rem rgba(0,0,0,.45);touch-action:none;user-select:none;
    -webkit-user-select:none;transition:box-shadow .3s,color .3s}
  .sx-power:disabled{cursor:default;opacity:.5}
  .sx-power:focus-visible{outline:3px solid var(--ember-2);outline-offset:4px}
  .sx-power svg.sx-icon{width:3rem;height:3rem}
  .sx-power svg.sx-ring{position:absolute;inset:0;width:100%;height:100%;transform:rotate(-90deg);pointer-events:none}
  .sx-ring circle{fill:none;stroke:var(--ember);stroke-width:5;stroke-linecap:round;stroke-dasharray:440;stroke-dashoffset:440}
  .sx-power.sx-arming .sx-ring circle{transition:stroke-dashoffset ${startHoldMs}ms linear;stroke-dashoffset:0}
  .sx[data-power="on"] .sx-power{color:#fff;background:radial-gradient(circle at 50% 35%,#ff9a4d,#c4410f);
    box-shadow:inset 0 0 0 2px #ffb15c55,0 0 2.5rem #ff6a1a66,0 .75rem 2rem rgba(0,0,0,.45)}
  .sx[data-heat="1"] .sx-power{animation:sx-glow 2.4s ease-in-out infinite}
  @keyframes sx-glow{50%{box-shadow:inset 0 0 0 2px #ffb15c88,0 0 3.5rem #ff6a1aaa,0 .75rem 2rem rgba(0,0,0,.45)}}
  .sx-state{font-size:1.6rem;font-weight:700;margin:1.1rem 0 .15rem}
  .sx-sub{color:var(--muted);font-size:.95rem;min-height:1.4em}
  .sx-chips{display:flex;gap:.5rem;justify-content:center;margin-top:1rem;flex-wrap:wrap}
  .sx-chip{display:flex;align-items:center;gap:.4rem;padding:.35rem .75rem;border-radius:99rem;
    background:#00000040;border:1px solid var(--line);font-size:.85rem;color:var(--muted)}
  .sx-chip[data-on="1"]{color:var(--text);border-color:#ff7a2f88}
  .sx-chip[data-on="1"] .sx-dot{background:var(--ember);box-shadow:0 0 .5rem var(--ember)}
  .sx-chip[data-kind="power"][data-on="1"]{border-color:#4fd18b88}
  .sx-chip[data-kind="power"][data-on="1"] .sx-dot{background:var(--on);box-shadow:0 0 .5rem var(--on)}
  .sx-grid{display:grid;grid-template-columns:1fr 1fr;gap:.9rem}
  .sx-adj h2,.sx-lights h2{font-size:.8rem;font-weight:600;letter-spacing:.08em;text-transform:uppercase;
    color:var(--muted);margin:0 0 .85rem}
  .sx-adj .sx-row{display:flex;gap:.5rem}
  .sx-btn{flex:1;min-height:3.5rem;border-radius:.9rem;border:1px solid var(--line);background:#00000033;
    color:var(--text);font:600 1.5rem system-ui;cursor:pointer;touch-action:none;user-select:none;
    -webkit-user-select:none;transition:background .15s,transform .1s,border-color .15s}
  .sx-btn:hover{border-color:#ff7a2f66}
  .sx-btn:focus-visible{outline:3px solid var(--ember-2);outline-offset:2px}
  .sx-btn.sx-active{background:#ff7a2f33;border-color:var(--ember);transform:scale(.97)}
  .sx-btn:disabled{opacity:.4;cursor:default}
  .sx-hint{color:var(--muted);font-size:.8rem;margin:.7rem 0 0}
  .sx-lights .sx-row{display:grid;grid-template-columns:1fr 1fr;gap:.5rem}
  .sx-lights .sx-btn{font-size:.95rem;display:flex;align-items:center;justify-content:center;gap:.5rem}
  .sx-lights svg{width:1.2rem;height:1.2rem}
  .sx-msg{min-height:1.4em;text-align:center;color:var(--danger);font-size:.9rem;margin:.25rem 0 .75rem}
  .sx-foot{display:flex;justify-content:space-between;align-items:center;color:var(--muted);font-size:.85rem;padding:0 .25rem}
  .sx-link{background:none;border:0;color:var(--ember-2);font:inherit;cursor:pointer;padding:.5rem 0;text-decoration:underline}
  .sx-back{display:none}
  html:not(.sx-custom) .sx{display:none}
  html:not(.sx-custom) .sx-back{display:block;position:fixed;right:1rem;bottom:1rem;z-index:10;padding:.75rem 1rem;
    border-radius:99rem;border:0;background:#ff7a2f;color:#1a0f08;font:600 .95rem system-ui;cursor:pointer;
    box-shadow:0 .5rem 1.5rem rgba(0,0,0,.3)}
  @media (max-width:22rem){.sx-grid{grid-template-columns:1fr}}
  @media (prefers-reduced-motion:reduce){.sx[data-heat="1"] .sx-power{animation:none}
    .sx-power.sx-arming .sx-ring circle{transition-duration:0s}}`;

  const powerIcon = '<svg class="sx-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M12 3v8"/><path d="M6.3 6.8a8 8 0 1 0 11.4 0"/></svg>';
  const bulbIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z"/></svg>';

  // ESPHome object_id: lowercase, spaces to "_", other symbols dropped.
  const objectId = name => name.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_-]/g, "");

  function el(tag, attrs = {}, html = "") {
    const node = document.createElement(tag);
    for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, value);
    if (html) node.innerHTML = html;
    return node;
  }

  function mount() {
    document.head.append(el("style", {}, css));
    document.documentElement.classList.add("sx-custom");

    const root = el("main", { class: "sx", "data-power": "unknown", "aria-label": "Sauna control" });
    root.innerHTML = `
      <header class="sx-head"><h1>Sauna</h1>
        <div class="sx-live" data-on="0"><span class="sx-dot"></span><span class="sx-live-text">Connecting…</span></div></header>
      <section class="sx-card sx-hero">
        <button type="button" class="sx-power" disabled aria-describedby="sx-sub">${powerIcon}
          <svg class="sx-ring" viewBox="0 0 152 152" aria-hidden="true"><circle cx="76" cy="76" r="70"/></svg></button>
        <div class="sx-state" role="status">—</div>
        <div class="sx-sub" id="sx-sub">Waiting for the sauna…</div>
        <div class="sx-chips">
          <span class="sx-chip" data-kind="power" data-on="0"><span class="sx-dot"></span>Power</span>
          <span class="sx-chip" data-kind="heat" data-on="0"><span class="sx-dot"></span>Heating</span></div>
      </section>
      <div class="sx-grid">
        <section class="sx-card sx-adj"><h2>Temperature</h2><div class="sx-row" data-adjust="Temp"></div></section>
        <section class="sx-card sx-adj"><h2>Time</h2><div class="sx-row" data-adjust="Time"></div></section>
      </div>
      <p class="sx-hint" style="margin:-.3rem .25rem .9rem">Tap for one step, hold to repeat. The set value shows on the sauna panel.</p>
      <section class="sx-card sx-lights"><h2>Lights</h2><div class="sx-row">
        <button type="button" class="sx-btn" data-press="Inside light">${bulbIcon}Inside</button>
        <button type="button" class="sx-btn" data-press="Outside light">${bulbIcon}Outside</button></div></section>
      <p class="sx-msg" role="alert"></p>
      <footer class="sx-foot"><span class="sx-wifi">Wi-Fi —</span>
        <button type="button" class="sx-link sx-show-std">Standard controls</button></footer>`;
    const back = el("button", { type: "button", class: "sx-back" }, "Sauna panel");
    document.body.prepend(root);
    document.body.append(back);

    const $ = selector => root.querySelector(selector);
    const power = $(".sx-power");
    const stateText = $(".sx-state");
    const subText = $(".sx-sub");
    const message = $(".sx-msg");
    const state = { on: null, heat: null, live: false };

    $(".sx-show-std").addEventListener("click", () => document.documentElement.classList.remove("sx-custom"));
    back.addEventListener("click", () => document.documentElement.classList.add("sx-custom"));

    function render() {
      root.dataset.power = state.on === null ? "unknown" : state.on ? "on" : "off";
      root.dataset.heat = state.on && state.heat ? "1" : "0";
      $('.sx-chip[data-kind="power"]').dataset.on = state.on ? "1" : "0";
      $('.sx-chip[data-kind="heat"]').dataset.on = state.heat ? "1" : "0";
      const live = $(".sx-live");
      live.dataset.on = state.live ? "1" : "0";
      live.querySelector(".sx-live-text").textContent = state.live ? "Live" : "Reconnecting…";
      power.disabled = state.on === null || !state.live;
      if (state.on === null) {
        stateText.textContent = "—";
        subText.textContent = "Waiting for the sauna…";
      } else if (state.on) {
        stateText.textContent = state.heat ? "Heating" : "On";
        subText.textContent = state.heat ? "Heater running. Tap to turn off." : "Holding temperature. Tap to turn off.";
      } else {
        stateText.textContent = "Off";
        subText.textContent = "Press and hold to start.";
      }
      power.setAttribute("aria-label", state.on ? "Turn sauna off" : "Hold to turn sauna on");
    }

    function showError(text) {
      message.textContent = text;
      clearTimeout(showError.timer);
      showError.timer = setTimeout(() => (message.textContent = ""), 5000);
    }

    // Name-based URLs first; fall back to object_id URLs on older firmware.
    async function command(domain, name, action) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3000);
      try {
        for (const id of [name, objectId(name)]) {
          const response = await fetch(`/${domain}/${encodeURIComponent(id)}/${action}`, {
            method: "POST", credentials: "same-origin", signal: controller.signal
          });
          if (response.status === 404) continue;
          if (!response.ok) throw new Error("HTTP " + response.status);
          return true;
        }
        throw new Error("HTTP 404");
      } catch (error) {
        showError(`${name} failed (${error.name === "AbortError" ? "timed out" : error.message}).`);
        return false;
      } finally {
        clearTimeout(timeout);
      }
    }

    // --- Power: hold to start, tap to stop -------------------------------
    let arm = null;
    function disarm() {
      if (!arm) return;
      clearTimeout(arm);
      arm = null;
      power.classList.remove("sx-arming");
    }
    function powerDown(event) {
      if (power.disabled || (event.button !== undefined && event.button !== 0)) return;
      if (state.on) {
        void command("switch", "Sauna", "turn_off");
        return;
      }
      power.classList.add("sx-arming");
      arm = setTimeout(() => {
        arm = null;
        power.classList.remove("sx-arming");
        if (navigator.vibrate) navigator.vibrate(30);
        void command("switch", "Sauna", "turn_on");
      }, startHoldMs);
    }
    power.addEventListener("pointerdown", event => {
      if (!event.isPrimary) return;
      power.setPointerCapture(event.pointerId);
      powerDown(event);
    });
    for (const name of ["pointerup", "pointercancel", "lostpointercapture"]) power.addEventListener(name, disarm);
    power.addEventListener("keydown", event => {
      if ((event.key === " " || event.key === "Enter") && !event.repeat) {
        event.preventDefault();
        powerDown(event);
      }
    });
    power.addEventListener("keyup", disarm);
    power.addEventListener("contextmenu", event => event.preventDefault());

    // --- Adjustments: tap for one step, hold to repeat -------------------
    let hold = null;
    let busy = false;
    let nextPress = 0;
    function stop() {
      if (!hold) return;
      clearTimeout(hold.timer);
      hold.button.classList.remove("sx-active");
      hold = null;
    }
    async function press(label) {
      if (busy || performance.now() < nextPress) return true;
      busy = true;
      try {
        const ok = await command("button", label, "press");
        if (!ok) stop();
        return ok;
      } finally {
        busy = false;
        nextPress = performance.now() + repeatMs;
      }
    }
    async function repeat(session) {
      if (hold !== session) return;
      if (!(await press(session.label)) || hold !== session) return;
      session.timer = setTimeout(() => repeat(session), Math.max(10, Math.ceil(nextPress - performance.now())));
    }
    for (const row of root.querySelectorAll("[data-adjust]")) {
      const kind = row.dataset.adjust;
      for (const [sign, text] of [["-", "−"], ["+", "+"]]) {
        const label = `${kind} ${sign}`;
        const button = el("button", { type: "button", class: "sx-btn", "aria-label": label }, text);
        button.addEventListener("pointerdown", event => {
          if (event.button !== 0 || !event.isPrimary || hold) return;
          const session = { label, button, pointerId: event.pointerId };
          button.setPointerCapture(event.pointerId);
          button.classList.add("sx-active");
          hold = session;
          session.timer = setTimeout(() => repeat(session), firstRepeatMs);
          void press(label);
        });
        for (const name of ["pointerup", "pointercancel", "lostpointercapture"]) {
          button.addEventListener(name, event => {
            if (hold?.pointerId === event.pointerId) stop();
          });
        }
        button.addEventListener("contextmenu", event => event.preventDefault());
        button.addEventListener("click", event => {
          // Mouse and touch already sent their first press on pointerdown.
          if (event.detail === 0 && !event.pointerType) void press(label);
        });
        row.append(button);
      }
    }
    window.addEventListener("blur", () => { stop(); disarm(); });
    window.addEventListener("pagehide", () => { stop(); disarm(); });
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) { stop(); disarm(); }
    });

    // --- Lights: single press each ---------------------------------------
    for (const button of root.querySelectorAll("[data-press]")) {
      button.addEventListener("click", async () => {
        button.classList.add("sx-active");
        await command("button", button.dataset.press, "press");
        setTimeout(() => button.classList.remove("sx-active"), 150);
      });
    }

    // --- Live state from the ESPHome event stream -------------------------
    // Matches both the legacy "domain-object_id" ids and newer name-based ids.
    function is(data, domain, name) {
      return data.id === `${domain}-${objectId(name)}` || data.name_id === `${domain}/${name}` ||
        (data.domain === domain && data.name === name);
    }
    const isOn = data => data.value === true || data.state === "ON";
    function apply(data) {
      if (is(data, "binary_sensor", "Sauna power")) state.on = isOn(data);
      else if (is(data, "binary_sensor", "Sauna heating")) state.heat = isOn(data);
      else if (is(data, "switch", "Sauna") && state.on === null) state.on = isOn(data);
      else if (is(data, "sensor", "Sauna WiFi signal")) {
        const rssi = Number(data.value);
        if (Number.isFinite(rssi)) {
          const quality = rssi >= -60 ? "strong" : rssi >= -70 ? "good" : rssi >= -80 ? "weak" : "poor";
          $(".sx-wifi").textContent = `Wi-Fi ${quality} (${Math.round(rssi)} dBm)`;
        }
        return;
      } else return;
      render();
    }
    const events = new EventSource("/events");
    events.addEventListener("open", () => { state.live = true; render(); });
    events.addEventListener("error", () => { state.live = false; disarm(); render(); });
    events.addEventListener("state", event => {
      try { apply(JSON.parse(event.data)); } catch { /* ignore malformed events */ }
    });
    render();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mount, { once: true });
  } else {
    mount();
  }
})();
