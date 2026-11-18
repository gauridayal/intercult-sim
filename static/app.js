(() => {
  "use strict";

  const scenarios = JSON.parse(document.getElementById("scenarios-data").textContent);
  const root = document.getElementById("app");

  const SCENARIO_META = {
    "airport-biosecurity": { theme: "Travel", focus: "Border screening", intensity: "High" },
    "silent-meeting": { theme: "Workplace", focus: "Indirect communication", intensity: "Medium" },
    "gursha-dinner": { theme: "Social", focus: "Ritual and hospitality", intensity: "Medium" },
    "the-morning-show": { theme: "Media", focus: "Single-story bias", intensity: "Medium" },
    screenplay: { theme: "Education", focus: "Face-saving disagreement", intensity: "Medium" },
    "what-she-doesnt-know": { theme: "Health", focus: "Family-mediated disclosure", intensity: "High" },
    "the-introduction": { theme: "Family", focus: "Ritual and belonging", intensity: "High" },
    "mother-tongue": { theme: "Intra-India", focus: "Language and regional identity", intensity: "Medium" },
    "straight-talk": { theme: "Workplace", focus: "Direct feedback", intensity: "Medium" },
    "bamboo-ceiling": { theme: "Workplace", focus: "Promotion bias", intensity: "High" },
  };

  const state = {
    view: "home",
    query: "",
    countryFilter: "All countries",
    themeFilter: "All themes",
    intensityFilter: "All levels",
    participant: {
      name: "",
      gender: "",
      age: "",
      identifier: "",
      fieldOfStudy: "",
      priorInterculturalExperience: "",
    },
    selected: null,
    messages: [],
    input: "",
    loading: false,
    error: null,
    ended: false,
    limitReached: false,
    userEnded: false,
    startedAt: null,
    feedback: emptyFeedback(),
    feedbackSubmitted: false,
    feedbackSubmitting: false,
  };

  function emptyFeedback() {
    return {
      overall: "",
      naturalness: "",
      perspectiveUnderstanding: "",
      culturalIssueIdentified: "",
      communicatedPerspective: "",
      consideredFeelings: "",
      challenge: "",
      roleConsistency: "",
      inappropriateResponse: "",
      inappropriateExplanation: "",
      mainChallenge: "",
      approachChange: "",
      realLifeDifference: "",
      comments: "",
    };
  }

  function metaFor(scenario) {
    return SCENARIO_META[scenario.id] || { theme: "General", focus: "Conversation", intensity: "Medium" };
  }

  function el(tag, attrs, children) {
    const node = document.createElement(tag);
    for (const [key, value] of Object.entries(attrs || {})) {
      if (key === "class") node.className = value;
      else if (key === "text") node.textContent = value;
      else if (key.startsWith("on") && typeof value === "function") node.addEventListener(key.slice(2), value);
      else if (value !== undefined && value !== null) node.setAttribute(key, value);
    }
    for (const child of children || []) {
      if (child) node.appendChild(child);
    }
    return node;
  }

  function countries() {
    const names = new Set();
    for (const scenario of scenarios) {
      if (scenario.ai_character?.country) names.add(scenario.ai_character.country);
      if (scenario.player?.country) names.add(scenario.player.country);
    }
    return ["All countries", ...Array.from(names).sort()];
  }

  function themes() {
    return ["All themes", ...Array.from(new Set(scenarios.map((s) => metaFor(s).theme))).sort()];
  }

  function render() {
    root.innerHTML = "";
    root.appendChild(renderShell());
  }

  function renderShell() {
    const shell = el("div", { class: "site-shell" });
    if (state.view === "chat") {
      shell.appendChild(renderChat());
      return shell;
    }
    shell.appendChild(renderHeader());
    if (state.view === "home") shell.appendChild(renderHome());
    else if (state.view === "simulations") shell.appendChild(renderSimulations());
    else if (state.view === "about") shell.appendChild(renderAbout());
    else if (state.view === "intake") shell.appendChild(renderIntake());
    else if (state.view === "briefing") shell.appendChild(renderBriefing());
    else if (state.view === "chat") shell.appendChild(renderChat());
    return shell;
  }

  function renderHeader() {
    return el("header", { class: "site-header" }, [
      el("button", {
        class: "brand",
        type: "button",
        text: "Virtual Intercultural Lab",
        onclick: () => go("home"),
      }),
      el("nav", { class: "site-nav", "aria-label": "Main navigation" }, [
        navButton("Home", "home"),
        navButton("Simulations", "simulations"),
        navButton("Participant Details", "intake"),
        navButton("About", "about"),
      ]),
    ]);
  }

  function navButton(label, view) {
    return el("button", {
      type: "button",
      class: `nav-link ${state.view === view ? "active" : ""}`,
      text: label,
      onclick: () => go(view),
    });
  }

  function go(view) {
    state.view = view;
    if (view === "simulations") state.selected = null;
    render();
  }

  function participantComplete() {
    const { name, gender, age, identifier, fieldOfStudy, priorInterculturalExperience } = state.participant;
    return Boolean(
      name.trim() &&
        gender &&
        age &&
        Number(age) >= 13 &&
        Number(age) <= 120 &&
        identifier.trim() &&
        fieldOfStudy.trim() &&
        priorInterculturalExperience
    );
  }

  function selectScenario(scenario) {
    state.selected = scenario;
    state.view = participantComplete() ? "briefing" : "intake";
    render();
  }

  function flagChip(person) {
    if (!person || !person.country) return null;
    const label = person.flag ? `${person.flag} ${person.country}` : person.country;
    return el("span", { class: "country-chip", text: label });
  }

  function renderHome() {
    const main = el("main", { class: "page" });
    main.appendChild(
      el("section", { class: "hero" }, [
        el("div", { class: "hero-copy" }, [
          el("p", { class: "eyebrow", text: "Interactive intercultural communication lab" }),
          el("h1", { text: "Practice Intercultural Communication in a Realistically Designed AI Simulation" }),
          el("p", {
            class: "hero-text",
            text:
              "Every conversation is a different perspective. Step into carefully designed scenarios, respond naturally, and reflect on how meaning, assumptions, and communication choices shift across contexts.",
          }),
          el("div", { class: "hero-actions" }, [
            el("button", { class: "primary-btn", type: "button", text: "Enter the Lab", onclick: () => go("simulations") }),
            el("button", { class: "secondary-btn", type: "button", text: "Participant Details", onclick: () => go("intake") }),
          ]),
        ]),
        el("div", { class: "hero-panel" }, [
          stat("Talk", "respond in your own words"),
          stat("Interpret", "notice assumptions and signals"),
          stat("Reflect", "capture what shifted"),
        ]),
      ])
    );
    main.appendChild(
      el("section", { class: "spotlight-band" }, [
        el("p", { class: "eyebrow", text: "Inside the lab" }),
        el("div", { class: "spotlight-grid" }, [
          spotlight("Perspective", "See how the same moment can be read differently by different people."),
          spotlight("Misunderstanding", "Practice repairing tension, silence, directness, or unexpected assumptions."),
          spotlight("Choice", "Experiment with tone, clarification, empathy, and disagreement in a low-risk space."),
        ]),
      ])
    );
    main.appendChild(
      el("section", { class: "content-band" }, [
        el("div", { class: "section-heading" }, [
          el("p", { class: "eyebrow", text: "How it works" }),
          el("h2", { text: "There are no perfect responses. The goal is to explore." }),
        ]),
        el("div", { class: "feature-grid" }, [
          feature("Choose a context", "Search by country, setting, or scenario focus before entering a simulation."),
          feature("Respond freely", "There are no multiple-choice answers. The conversation adapts to what you actually write."),
          feature("Reflect after", "A short required exit survey captures your strategy, confidence, and perception of the exchange."),
        ]),
      ])
    );
    main.appendChild(
      el("section", { class: "reflection-band" }, [
        el("div", {}, [
          el("p", { class: "eyebrow", text: "Reflection" }),
          el("h2", { text: "The conversation ends. The learning begins." }),
        ]),
        el("div", { class: "prompt-list" }, [
          el("span", { text: "What assumptions did I make?" }),
          el("span", { text: "Where did the conversation shift?" }),
          el("span", { text: "What would I try differently?" }),
        ]),
      ])
    );
    return main;
  }

  function stat(value, label) {
    return el("div", { class: "stat" }, [el("strong", { text: value }), el("span", { text: label })]);
  }

  function feature(title, body) {
    return el("article", { class: "feature" }, [el("h3", { text: title }), el("p", { text: body })]);
  }

  function spotlight(title, body) {
    return el("article", { class: "spotlight-card" }, [el("h2", { text: title }), el("p", { text: body })]);
  }

  function renderAbout() {
    return el("main", { class: "page narrow-page" }, [
      backButton("Back", () => go("home")),
      el("p", { class: "eyebrow", text: "About the study" }),
      el("h1", { class: "page-title", text: "What this simulator records" }),
      el("p", {
        class: "page-intro",
        text:
          "Each session keeps the transcript, basic participant details, your exit survey, and a model-generated analysis for research review. Your email or assigned ID is used only to group repeated sessions by the same participant.",
      }),
      el("div", { class: "info-list" }, [
        infoRow("Participant control", "You may use an email or assigned ID number, depending on how your study group is organized."),
        infoRow("Scenario design", "Every scene places an Indian participant character in a specific cross-cultural or intra-cultural communication challenge."),
        infoRow("Data storage", "Finished sessions are kept privately and safely for later research analysis. They are not shown to other participants, and they are used only to understand communication patterns across sessions."),
      ]),
    ]);
  }

  function infoRow(title, body) {
    return el("section", { class: "info-row" }, [el("h2", { text: title }), el("p", { text: body })]);
  }

  function renderSimulations() {
    const main = el("main", { class: "page catalogue-page" });
    main.appendChild(backButton("Back", () => go("home")));
    main.appendChild(
      el("div", { class: "section-heading catalogue-heading" }, [
        el("div", {}, [
          el("p", { class: "eyebrow", text: "Simulation catalogue" }),
          el("h1", { class: "page-title", text: "Find a scenario" }),
        ]),
        el("p", {
          class: "page-intro compact",
          text: "Search by title, country, setting, or communication theme. Each simulation opens with a briefing before the chat begins.",
        }),
      ])
    );
    main.appendChild(renderFilters());
    const filtered = filteredScenarios();
    main.appendChild(el("p", { class: "results-count", text: `${filtered.length} simulation${filtered.length === 1 ? "" : "s"} found` }));
    const grid = el("div", { class: "scenario-grid" });
    for (const scenario of filtered) grid.appendChild(renderScenarioCard(scenario));
    if (!filtered.length) grid.appendChild(el("p", { class: "empty-state", text: "No simulations match those filters." }));
    main.appendChild(grid);
    return main;
  }

  function renderFilters() {
    const search = el("input", {
      class: "search-input",
      type: "search",
      placeholder: "Search countries, titles, themes, settings...",
      value: state.query,
    });
    search.addEventListener("input", () => {
      state.query = search.value;
      render();
      queueMicrotask(() => {
        const nextSearch = document.querySelector(".search-input");
        if (nextSearch) {
          nextSearch.focus();
          nextSearch.setSelectionRange(nextSearch.value.length, nextSearch.value.length);
        }
      });
    });
    return el("section", { class: "filters", "aria-label": "Simulation filters" }, [
      search,
      selectFilter("Country", countries(), state.countryFilter, (value) => {
        state.countryFilter = value;
        render();
      }),
      selectFilter("Theme", themes(), state.themeFilter, (value) => {
        state.themeFilter = value;
        render();
      }),
      selectFilter("Challenge", ["All levels", "Medium", "High"], state.intensityFilter, (value) => {
        state.intensityFilter = value;
        render();
      }),
    ]);
  }

  function selectFilter(label, options, current, onChange) {
    const select = el("select", { class: "filter-select", "aria-label": label });
    for (const option of options) select.appendChild(el("option", { value: option, text: option }));
    select.value = current;
    select.addEventListener("change", () => onChange(select.value));
    return select;
  }

  function filteredScenarios() {
    const query = state.query.trim().toLowerCase();
    return scenarios.filter((scenario) => {
      const meta = metaFor(scenario);
      const haystack = [
        scenario.title,
        scenario.tagline,
        scenario.location,
        scenario.player?.country,
        scenario.ai_character?.country,
        meta.theme,
        meta.focus,
        meta.intensity,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      const countryMatch =
        state.countryFilter === "All countries" ||
        scenario.player?.country === state.countryFilter ||
        scenario.ai_character?.country === state.countryFilter;
      const themeMatch = state.themeFilter === "All themes" || meta.theme === state.themeFilter;
      const intensityMatch = state.intensityFilter === "All levels" || meta.intensity === state.intensityFilter;
      return (!query || haystack.includes(query)) && countryMatch && themeMatch && intensityMatch;
    });
  }

  function renderScenarioCard(scenario) {
    const meta = metaFor(scenario);
    return el("button", { class: "scenario-card", type: "button", onclick: () => selectScenario(scenario) }, [
      el("div", { class: "card-topline" }, [
        el("span", { class: "pill", text: meta.theme }),
        el("span", { class: "duration", text: `${scenario.min_turns}-${scenario.max_turns} turns` }),
      ]),
      el("h2", { text: scenario.title }),
      el("p", { text: scenario.tagline }),
      el("div", { class: "scenario-meta" }, [
        flagChip(scenario.ai_character),
        el("span", { text: meta.focus }),
        el("span", { text: meta.intensity }),
      ]),
    ]);
  }

  function renderIntake() {
    const main = el("main", { class: "page narrow-page" });
    main.appendChild(backButton("Back", () => go(state.selected ? "simulations" : "home")));
    main.appendChild(el("p", { class: "eyebrow", text: "Participant record" }));
    main.appendChild(el("h1", { class: "page-title", text: "Before the simulation" }));
    main.appendChild(
      el("p", {
        class: "page-intro",
        text:
          "These details are about you, not the character you will play. The AI character will not see them. Your email or assigned ID groups your sessions for later analysis.",
      })
    );
    const form = el("form", {
      class: "form-panel",
      onsubmit: (e) => {
        e.preventDefault();
        if (!participantComplete()) return;
        state.view = state.selected ? "briefing" : "simulations";
        render();
      },
    });
    const controls = [
      ["Email or ID number", inputField("text", "you@example.com or assigned ID", "identifier")],
      ["Name", inputField("text", "Your name", "name")],
      ["Gender", choiceField(["", "Male", "Female", "Non-binary", "Prefer not to say"], "gender")],
      ["Age", inputField("number", "Your age", "age", { min: "13", max: "120" })],
      ["Field of study", inputField("text", "e.g. Psychology, Computer Science", "fieldOfStudy")],
      ["Have you lived, studied, or worked in a culture different from your own?", choiceField(["", "Yes", "No"], "priorInterculturalExperience")],
    ];
    for (const [label, control] of controls) form.appendChild(labelWrap(label, control));
    const submit = el("button", {
      class: "primary-btn full-width",
      type: "submit",
      text: state.selected ? "Continue to briefing" : "Save details",
    });
    const refreshSubmit = () => {
      submit.disabled = !participantComplete();
    };
    for (const [, control] of controls) {
      control.addEventListener("input", refreshSubmit);
      control.addEventListener("change", refreshSubmit);
    }
    refreshSubmit();
    form.appendChild(submit);
    main.appendChild(form);
    return main;
  }

  function inputField(type, placeholder, key, extraAttrs) {
    const input = el("input", { class: "form-control", type, placeholder, autocomplete: "off", ...(extraAttrs || {}) });
    input.value = state.participant[key];
    input.addEventListener("input", () => {
      state.participant[key] = input.value;
    });
    return input;
  }

  function choiceField(options, key) {
    const select = el("select", { class: "form-control" });
    for (const option of options) select.appendChild(el("option", { value: option, text: option || "Select one" }));
    select.value = state.participant[key];
    select.addEventListener("change", () => {
      state.participant[key] = select.value;
    });
    return select;
  }

  function labelWrap(label, control) {
    return el("label", { class: "field-label", text: label }, [control]);
  }

  function backButton(label, onClick) {
    return el("button", { class: "back-btn", type: "button", text: `← ${label}`, onclick: onClick });
  }

  function renderBriefing() {
    const scenario = state.selected;
    const meta = metaFor(scenario);
    return el("main", { class: "page narrow-page" }, [
      backButton("All simulations", () => go("simulations")),
      el("p", { class: "eyebrow spaced", text: meta.theme }),
      el("h1", { class: "page-title", text: scenario.title }),
      el("p", { class: "scenario-location", text: scenario.location }),
      el("div", { class: "briefing-text" }, scenario.briefing.map((para) => el("p", { text: para }))),
      el("div", { class: "persona-grid" }, [
        personaCard("You are", scenario.player),
        personaCard("Talking to", scenario.ai_character),
      ]),
      el("button", { class: "primary-btn full-width", type: "button", text: "Begin simulation", onclick: beginScenario }),
    ]);
  }

  function personaCard(label, person) {
    return el("article", { class: "persona-card" }, [
      el("p", { class: "persona-label", text: label }),
      el("h2", { text: person.name }),
      flagChip(person),
      el("p", { text: person.bio }),
    ]);
  }

  function beginScenario() {
    state.messages = [{ role: "assistant", content: state.selected.opening_line }];
    state.error = null;
    state.ended = false;
    state.limitReached = false;
    state.userEnded = false;
    state.startedAt = new Date().toISOString();
    state.input = "";
    state.feedback = emptyFeedback();
    state.feedbackSubmitted = false;
    state.feedbackSubmitting = false;
    state.view = "chat";
    render();
  }

  function resetConversation() {
    state.view = "simulations";
    state.selected = null;
    state.messages = [];
    state.input = "";
    state.error = null;
    state.ended = false;
    state.limitReached = false;
    state.userEnded = false;
    state.startedAt = null;
    state.feedback = emptyFeedback();
    state.feedbackSubmitted = false;
    state.feedbackSubmitting = false;
    render();
  }

  function renderChat() {
    const scenario = state.selected;
    const conversationOver = state.ended || state.limitReached || state.userEnded;
    const hasReplied = state.messages.some((m) => m.role === "user");
    const main = el("main", { class: "chat-page" });
    main.appendChild(
      el("header", { class: "chat-header" }, [
        el("div", {}, [
          el("p", { class: "chat-title", text: scenario.title }),
          el("p", { class: "chat-subtitle", text: scenario.location }),
        ]),
        el("button", {
          class: "text-btn",
          type: "button",
          text: hasReplied ? "End" : "Leave",
          onclick: hasReplied ? endConversation : resetConversation,
        }),
      ])
    );
    const log = el("section", { class: "chat-log", id: "chat-log", "aria-live": "polite" });
    for (const message of state.messages) log.appendChild(renderBubble(message, scenario));
    if (state.loading) log.appendChild(renderBubble({ role: "assistant", content: "..." }, scenario));
    main.appendChild(log);
    if (state.error) main.appendChild(el("p", { class: "notice error", text: state.error }));
    if (conversationOver && !state.feedbackSubmitted) {
      main.appendChild(renderFeedbackForm());
    } else if (conversationOver) {
      main.appendChild(
        el("div", { class: "notice ended" }, [
          document.createTextNode("Session recorded. "),
          el("button", { class: "link", type: "button", text: "Try another simulation", onclick: resetConversation }),
        ])
      );
    }
    if (!conversationOver && hasReplied) {
      main.appendChild(el("div", { class: "end-row" }, [el("button", { class: "secondary-btn small", type: "button", text: "End conversation", onclick: endConversation })]));
    }
    main.appendChild(renderChatForm(inputDisabled(conversationOver)));
    queueMicrotask(() => {
      const logEl = document.getElementById("chat-log");
      const textarea = document.getElementById("chat-input");
      if (logEl) logEl.scrollTop = logEl.scrollHeight;
      if (textarea && !textarea.disabled) textarea.focus();
    });
    return main;
  }

  function inputDisabled(conversationOver) {
    return state.loading || conversationOver;
  }

  function renderChatForm(disabled) {
    const scenario = state.selected;
    const form = el("form", {
      class: "chat-form",
      onsubmit: (e) => {
        e.preventDefault();
        sendMessage();
      },
    });
    const textarea = el("textarea", {
      id: "chat-input",
      class: "chat-input",
      rows: "1",
      placeholder: disabled ? "This simulation has ended." : `Reply as ${scenario.player.name}...`,
      onkeydown: (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          sendMessage();
        }
      },
    });
    textarea.value = state.input;
    textarea.disabled = disabled;
    const send = el("button", { class: "primary-btn send-btn", type: "submit", text: "Send" });
    send.disabled = disabled || !state.input.trim();
    textarea.addEventListener("input", () => {
      state.input = textarea.value;
      send.disabled = disabled || !state.input.trim();
    });
    form.appendChild(textarea);
    form.appendChild(send);
    return form;
  }

  function renderBubble(message, scenario) {
    const isUser = message.role === "user";
    const name = isUser ? scenario.player.name : scenario.ai_character.name;
    return el("div", { class: `bubble-row ${isUser ? "user" : "assistant"}` }, [
      el("div", { class: "bubble-col" }, [
        el("span", { class: "bubble-name", text: name }),
        el("div", { class: `bubble ${isUser ? "user" : "assistant"}`, text: message.content }),
      ]),
    ]);
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
      state.messages = state.messages.slice(0, -1);
      state.input = text;
      state.error = err instanceof Error ? err.message : "Something went wrong.";
    } finally {
      state.loading = false;
      render();
    }
  }

  function endConversation() {
    if (state.ended || state.limitReached || state.userEnded) return;
    state.userEnded = true;
    render();
  }

  function renderFeedbackForm() {
    const form = el("form", {
      class: "feedback-panel",
      onsubmit: (e) => {
        e.preventDefault();
        submitFeedback();
      },
    });
    form.appendChild(el("p", { class: "eyebrow", text: "Exit survey" }));
    form.appendChild(el("h2", { text: "Before you leave this simulation" }));
    form.appendChild(
      el("p", {
        class: "feedback-intro",
        text: "Please answer these short questions. They help connect your experience with the transcript and model analysis.",
      })
    );
    form.appendChild(ratingField("Overall, how would you rate this conversation?", "overall"));
    form.appendChild(ratingField("How natural or human did the AI feel?", "naturalness"));
    form.appendChild(ratingField("I understood the other person's perspective.", "perspectiveUnderstanding"));
    form.appendChild(ratingField("I could identify the cultural or communication issue.", "culturalIssueIdentified"));
    form.appendChild(ratingField("I was able to communicate my perspective clearly.", "communicatedPerspective"));
    form.appendChild(ratingField("I considered the other person's feelings and expectations.", "consideredFeelings"));
    form.appendChild(ratingField("How challenging was this scenario?", "challenge"));
    form.appendChild(choiceSurveyField("Did the chatbot behave consistently with its assigned role?", "roleConsistency", ["", "Yes", "Partly", "No"]));
    form.appendChild(choiceSurveyField("Did you encounter an inappropriate, stereotypical, or confusing chatbot response?", "inappropriateResponse", ["", "Yes", "No"]));
    if (state.feedback.inappropriateResponse === "Yes") {
      form.appendChild(textSurveyField("Please briefly explain what happened.", "inappropriateExplanation", "One or two sentences is enough."));
    }
    form.appendChild(textSurveyField("What was the main communication challenge?", "mainChallenge", "Describe the main difficulty you navigated."));
    form.appendChild(textSurveyField("Did you change your communication approach? If yes, how?", "approachChange", "Optional but useful."));
    form.appendChild(textSurveyField("What would you do differently in real life?", "realLifeDifference", "Optional reflection."));
    form.appendChild(textSurveyField("Any other comments?", "comments", "Optional."));
    if (state.error) form.appendChild(el("p", { class: "notice error", text: state.error }));
    const submit = el("button", {
      class: "primary-btn full-width",
      type: "submit",
      text: state.feedbackSubmitting ? "Submitting..." : "Submit exit survey",
    });
    submit.disabled = state.feedbackSubmitting || !feedbackComplete();
    form.appendChild(submit);
    const refreshSubmit = () => {
      submit.disabled = state.feedbackSubmitting || !feedbackComplete();
    };
    form.addEventListener("input", refreshSubmit);
    form.addEventListener("change", refreshSubmit);
    return form;
  }

  function ratingField(label, key) {
    return choiceSurveyField(label, key, ["", "1", "2", "3", "4", "5"], "1 = low / strongly disagree, 5 = high / strongly agree");
  }

  function choiceSurveyField(label, key, options, helper) {
    const select = el("select", { class: "form-control" });
    for (const option of options) select.appendChild(el("option", { value: option, text: option || "Select one" }));
    select.value = state.feedback[key];
    select.addEventListener("change", () => {
      state.feedback[key] = select.value;
      if (key === "inappropriateResponse" && select.value !== "Yes") state.feedback.inappropriateExplanation = "";
      render();
    });
    const stack = el("div", { class: "field-stack" }, [select]);
    if (helper) stack.appendChild(el("span", { class: "field-help", text: helper }));
    return labelWrap(label, stack);
  }

  function textSurveyField(label, key, placeholder) {
    const textarea = el("textarea", { class: "form-control text-area", rows: "3", placeholder });
    textarea.value = state.feedback[key];
    textarea.addEventListener("input", () => {
      state.feedback[key] = textarea.value;
    });
    return labelWrap(label, textarea);
  }

  function feedbackComplete() {
    const required = [
      "overall",
      "naturalness",
      "perspectiveUnderstanding",
      "culturalIssueIdentified",
      "communicatedPerspective",
      "consideredFeelings",
      "challenge",
      "roleConsistency",
      "inappropriateResponse",
      "mainChallenge",
    ];
    const baseComplete = required.every((key) => String(state.feedback[key] || "").trim());
    if (!baseComplete) return false;
    return state.feedback.inappropriateResponse !== "Yes" || state.feedback.inappropriateExplanation.trim();
  }

  async function submitFeedback() {
    if (state.feedbackSubmitting || state.feedbackSubmitted || !feedbackComplete()) return;
    state.feedbackSubmitting = true;
    state.error = null;
    render();
    const endedReason = state.ended ? "resolved" : state.limitReached ? "turn_limit" : "user_ended";
    try {
      const res = await fetch("/api/finish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scenarioId: state.selected.id,
          history: state.messages,
          startedAt: state.startedAt,
          participant: state.participant,
          endedReason,
          feedback: {
            overall_rating: state.feedback.overall,
            naturalness_rating: state.feedback.naturalness,
            perspective_understanding: state.feedback.perspectiveUnderstanding,
            cultural_issue_identified: state.feedback.culturalIssueIdentified,
            communicated_perspective: state.feedback.communicatedPerspective,
            considered_feelings: state.feedback.consideredFeelings,
            challenge_rating: state.feedback.challenge,
            role_consistency: state.feedback.roleConsistency,
            inappropriate_response: state.feedback.inappropriateResponse,
            inappropriate_response_explanation: state.feedback.inappropriateExplanation || null,
            main_challenge: state.feedback.mainChallenge,
            approach_change: state.feedback.approachChange || null,
            real_life_difference: state.feedback.realLifeDifference || null,
            comments: state.feedback.comments || null,
          },
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "The session could not be saved. Please try again.");
      state.feedbackSubmitted = true;
    } catch (err) {
      state.error = err instanceof Error ? err.message : "The session could not be saved. Please try again.";
    } finally {
      state.feedbackSubmitting = false;
      render();
    }
  }

  render();
})();
