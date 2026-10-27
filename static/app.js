(() => {
  "use strict";

  const scenarios = JSON.parse(document.getElementById("scenarios-data").textContent);
  const root = document.getElementById("app");

  const ACCENT_BY_ID = {
    "airport-biosecurity": "plum",
    "silent-meeting": "sage",
    "gursha-dinner": "rose",
    "the-morning-show": "sand",
    "screenplay": "slate",
    "what-she-doesnt-know": "teal",
    "the-introduction": "clay",
    "mother-tongue": "saffron",
    "straight-talk": "azure",
    "bamboo-ceiling": "moss",
  };

  function accentFor(id) {
    return ACCENT_BY_ID[id] || "sand";
  }

  function flagChip(person) {
    if (!person || !person.country) return null;
    const label = person.flag ? `${person.flag} ${person.country}` : person.country;
    return el("span", { class: "country-chip", text: label });
  }

  const state = {
    view: "intake", // 'intake' | 'menu' | 'briefing' | 'chat'
    participant: { name: "", gender: "", age: "" },
    selected: null,
    messages: [], // {role: 'user'|'assistant', content: string}
    input: "",
    loading: false,
    error: null,
    ended: false,
    limitReached: false,
    userEnded: false,
    endingConversation: false,
    startedAt: null,
  };

  function el(tag, attrs, children) {
    const node = document.createElement(tag);
    for (const [key, value] of Object.entries(attrs || {})) {
      if (key === "class") node.className = value;
      else if (key === "text") node.textContent = value;
      else if (key.startsWith("on") && typeof value === "function") {
        node.addEventListener(key.slice(2), value);
      } else if (value !== undefined && value !== null) {
        node.setAttribute(key, value);
      }
    }
    for (const child of children || []) {
      if (child) node.appendChild(child);
    }
    return node;
  }

  function render() {
    root.innerHTML = "";
    if (state.view === "intake") root.appendChild(renderIntake());
    else if (state.view === "menu") root.appendChild(renderMenu());
    else if (state.view === "briefing") root.appendChild(renderBriefing());
    else if (state.view === "chat") root.appendChild(renderChat());
  }

  // ---------- Intake ----------

  function intakeComplete() {
    const { name, gender, age } = state.participant;
    return Boolean(name.trim() && gender && age && Number(age) >= 13 && Number(age) <= 120);
  }

  function renderIntake() {
    const wrap = el("main", { class: "wrap" });

    wrap.appendChild(el("div", { class: "eyebrow", text: "Intercultural Communication" }));
    wrap.appendChild(el("h1", { class: "page-title", text: "Before we begin" }));
    wrap.appendChild(
      el("p", {
        class: "page-intro",
        text:
          "A few quick details for the research record. This is about you, the " +
          "real person testing this -- not the character you'll play. Never shown " +
          "to the AI character, and not reused anywhere else.",
      })
    );

    const form = el("form", {
      class: "intake-form",
      onsubmit: (e) => {
        e.preventDefault();
        if (!intakeComplete()) return;
        state.view = "menu";
        render();
      },
    });

    const nameInput = el("input", {
      class: "intake-input",
      type: "text",
      autocomplete: "off",
      placeholder: "Your name",
    });
    nameInput.value = state.participant.name;

    const genderSelect = el("select", { class: "intake-input" }, [
      el("option", { value: "", text: "Select one" }),
      el("option", { value: "Male", text: "Male" }),
      el("option", { value: "Female", text: "Female" }),
      el("option", { value: "Non-binary", text: "Non-binary" }),
      el("option", { value: "Prefer not to say", text: "Prefer not to say" }),
    ]);
    genderSelect.value = state.participant.gender;

    const ageInput = el("input", {
      class: "intake-input",
      type: "number",
      min: "13",
      max: "120",
      placeholder: "Your age",
    });
    ageInput.value = state.participant.age;

    const continueBtn = el("button", {
      type: "submit",
      class: "begin-btn accent-sand-solid",
      text: "Continue",
    });
    continueBtn.disabled = !intakeComplete();

    const refreshContinue = () => {
      continueBtn.disabled = !intakeComplete();
    };
    nameInput.addEventListener("input", () => {
      state.participant.name = nameInput.value;
      refreshContinue();
    });
    genderSelect.addEventListener("change", () => {
      state.participant.gender = genderSelect.value;
      refreshContinue();
    });
    ageInput.addEventListener("input", () => {
      state.participant.age = ageInput.value;
      refreshContinue();
    });

    form.appendChild(el("label", { class: "intake-label", text: "Name" }, [nameInput]));
    form.appendChild(el("label", { class: "intake-label", text: "Gender" }, [genderSelect]));
    form.appendChild(el("label", { class: "intake-label", text: "Age" }, [ageInput]));
    form.appendChild(continueBtn);

    wrap.appendChild(form);
    return wrap;
  }

  // ---------- Menu ----------

  function renderMenu() {
    const wrap = el("main", { class: "wrap" });

    wrap.appendChild(
      el("div", { class: "eyebrow", text: "Intercultural Communication" })
    );
    wrap.appendChild(el("h1", { class: "page-title", text: "Pick a scenario" }));
    wrap.appendChild(
      el("p", {
        class: "page-intro",
        text:
          "You'll get a character and a short situation, then it's just a conversation " +
          "-- type what you'd actually say. No menus, no right answer.",
      })
    );

    const grid = el("div", { class: "scenario-grid" });
    for (const s of scenarios) {
      grid.appendChild(renderScenarioCard(s));
    }
    wrap.appendChild(grid);

    return wrap;
  }

  function renderScenarioCard(scenario) {
    const accent = accentFor(scenario.id);
    const card = el("button", {
      class: "card scenario-card",
      onclick: () => {
        state.selected = scenario;
        state.view = "briefing";
        render();
      },
    });

    const chip = el("span", { class: `chip accent-${accent}-chip` }, [
      el("span", { class: `chip-dot accent-${accent}-dot` }),
      document.createTextNode(scenario.location),
    ]);

    card.appendChild(chip);
    card.appendChild(el("h3", { text: scenario.title }));
    card.appendChild(el("p", { text: scenario.tagline }));
    card.appendChild(
      el("span", { class: `card-cta accent-${accent}-text`, text: "Begin scenario →" })
    );

    return card;
  }

  // ---------- Briefing ----------

  function renderBriefing() {
    const scenario = state.selected;
    const accent = accentFor(scenario.id);
    const wrap = el("main", { class: "wrap" });

    wrap.appendChild(
      el("button", {
        class: "back-link",
        text: "← All scenarios",
        onclick: backToMenu,
      })
    );

    wrap.appendChild(el("h1", { class: "briefing-title", text: scenario.title }));
    wrap.appendChild(
      el("p", { class: `briefing-location accent-${accent}-text`, text: scenario.location })
    );

    const briefingText = el("div", { class: "briefing-text" });
    for (const para of scenario.briefing) {
      briefingText.appendChild(el("p", { text: para }));
    }
    wrap.appendChild(briefingText);

    const grid = el("div", { class: "persona-grid" });
    grid.appendChild(
      el("div", { class: "card" }, [
        el("p", { class: "persona-label", text: "You are" }),
        el("p", { class: "persona-name serif", text: scenario.player.name }),
        flagChip(scenario.player),
        el("p", { class: "persona-bio", text: scenario.player.bio }),
      ])
    );
    grid.appendChild(
      el("div", { class: "card" }, [
        el("p", { class: "persona-label", text: "Talking to" }),
        el("p", {
          class: `persona-name serif accent-${accent}-text`,
          text: scenario.ai_character.name,
        }),
        flagChip(scenario.ai_character),
        el("p", { class: "persona-bio", text: scenario.ai_character.bio }),
      ])
    );
    wrap.appendChild(grid);

    wrap.appendChild(
      el("button", {
        class: `begin-btn accent-${accent}-solid`,
        text: "Begin",
        onclick: beginScenario,
      })
    );

    return wrap;
  }

  function beginScenario() {
    state.messages = [{ role: "assistant", content: state.selected.opening_line }];
    state.error = null;
    state.ended = false;
    state.limitReached = false;
    state.userEnded = false;
    state.endingConversation = false;
    state.startedAt = new Date().toISOString();
    state.input = "";
    state.view = "chat";
    render();
  }

  function backToMenu() {
    state.view = "menu";
    state.selected = null;
    state.messages = [];
    state.input = "";
    state.error = null;
    state.ended = false;
    state.limitReached = false;
    state.userEnded = false;
    state.endingConversation = false;
    state.startedAt = null;
    render();
  }

  // ---------- Chat ----------

  function renderChat() {
    const scenario = state.selected;
    const accent = accentFor(scenario.id);
    const wrap = el("main", { class: "wrap chat-wrap" });

    const header = el("div", { class: "chat-header" }, [
      el("div", {}, [
        el("p", { class: "chat-title serif", text: scenario.title }),
        el("p", { class: `chat-location accent-${accent}-text`, text: scenario.location }),
        flagChip(scenario.ai_character),
      ]),
      el("button", { class: "back-link", text: "Leave scenario", onclick: backToMenu }),
    ]);
    wrap.appendChild(header);

    const log = el("div", { class: "chat-log", id: "chat-log" });
    for (const m of state.messages) {
      log.appendChild(renderBubble(m, scenario, accent));
    }
    if (state.loading) {
      log.appendChild(
        renderBubble({ role: "assistant", content: "…" }, scenario, accent)
      );
    }
    wrap.appendChild(log);

    if (state.error) {
      wrap.appendChild(el("p", { class: "notice error", text: state.error }));
    }
    if (state.ended) {
      wrap.appendChild(
        el("div", { class: "notice ended" }, [
          document.createTextNode("Scene complete. "),
          el("button", { class: "link", text: "Try another scenario", onclick: backToMenu }),
        ])
      );
    }
    if (state.limitReached) {
      wrap.appendChild(
        el("div", { class: "notice limit" }, [
          document.createTextNode("This scene reached its turn limit. "),
          el("button", { class: "link", text: "Try another scenario", onclick: backToMenu }),
        ])
      );
    }
    if (state.userEnded) {
      wrap.appendChild(
        el("div", { class: "notice ended" }, [
          document.createTextNode("You ended this conversation. "),
          el("button", { class: "link", text: "Try another scenario", onclick: backToMenu }),
        ])
      );
    }

    const conversationOver = state.ended || state.limitReached || state.userEnded;
    const inputDisabled = state.loading || conversationOver;
    const hasReplied = state.messages.some((m) => m.role === "user");

    if (!conversationOver && hasReplied) {
      wrap.appendChild(
        el("div", { class: "end-row" }, [
          el("button", {
            class: "end-btn",
            type: "button",
            text: state.endingConversation ? "Ending…" : "End conversation",
            disabled: state.endingConversation ? "disabled" : undefined,
            onclick: endConversation,
          }),
        ])
      );
    }

    const form = el("form", {
      class: "chat-form",
      onsubmit: (e) => {
        e.preventDefault();
        sendMessage();
      },
    });

    const textarea = el("textarea", {
      class: "chat-input",
      rows: "1",
      placeholder: inputDisabled
        ? "This scene has ended."
        : `Reply as ${scenario.player.name}...`,
      onkeydown: (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          sendMessage();
        }
      },
    });
    textarea.value = state.input;
    if (inputDisabled) textarea.setAttribute("disabled", "disabled");

    const sendBtn = el("button", {
      type: "submit",
      class: `send-btn accent-${accent}-solid`,
      text: "Send",
    });
    if (inputDisabled || !state.input.trim()) sendBtn.setAttribute("disabled", "disabled");

    // Toggle Send's disabled state directly on keystroke instead of a full
    // re-render, which would otherwise reset focus and cursor position.
    textarea.addEventListener("input", () => {
      state.input = textarea.value;
      sendBtn.disabled = inputDisabled || !state.input.trim();
    });

    form.appendChild(textarea);
    form.appendChild(sendBtn);
    wrap.appendChild(form);

    queueMicrotask(() => {
      const logEl = document.getElementById("chat-log");
      if (logEl) logEl.scrollTop = logEl.scrollHeight;
      if (!inputDisabled) textarea.focus();
    });

    return wrap;
  }

  function renderBubble(message, scenario, accent) {
    const isUser = message.role === "user";
    const name = isUser ? scenario.player.name : scenario.ai_character.name;
    const row = el("div", { class: `bubble-row ${isUser ? "user" : "assistant"}` });
    const col = el("div", { class: "bubble-col" }, [
      el("span", {
        class: `bubble-name ${isUser ? "user" : `accent-${accent}-text`}`,
        text: name,
      }),
      el("div", { class: `bubble ${isUser ? "user" : "assistant"}`, text: message.content }),
    ]);
    row.appendChild(col);
    return row;
  }

  async function sendMessage() {
    const text = state.input.trim();
    if (!text || state.loading || state.ended || state.limitReached || state.userEnded) return;

    const nextMessages = [...state.messages, { role: "user", content: text }];
    state.messages = nextMessages;
    state.input = "";
    state.loading = true;
    state.error = null;
    render();

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scenarioId: state.selected.id,
          history: nextMessages,
          startedAt: state.startedAt,
          participant: state.participant,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong talking to the model.");

      state.messages = [...nextMessages, { role: "assistant", content: data.reply }];
      if (data.ended) state.ended = true;
      else if (data.limitReached) state.limitReached = true;
    } catch (err) {
      state.messages = state.messages.slice(0, -1); // roll back the optimistic user message
      state.input = text; // let them retry without retyping
      state.error = err instanceof Error ? err.message : "Something went wrong.";
    } finally {
      state.loading = false;
      render();
    }
  }

  async function endConversation() {
    if (state.endingConversation || state.ended || state.limitReached || state.userEnded) return;
    state.endingConversation = true;
    state.error = null;
    render();

    try {
      const res = await fetch("/api/end", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scenarioId: state.selected.id,
          history: state.messages,
          startedAt: state.startedAt,
          participant: state.participant,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Couldn't end the conversation cleanly.");
      state.userEnded = true;
    } catch (err) {
      state.error = err instanceof Error ? err.message : "Something went wrong.";
    } finally {
      state.endingConversation = false;
      render();
    }
  }

  render();
})();
