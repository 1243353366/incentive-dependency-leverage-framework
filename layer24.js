/**
 * Layer 24: actor analysis.
 *
 * The questions came in as one list, but they are not one kind of thing. Three kinds, and the
 * difference decides whether this layer makes an analysis stronger or just makes a person
 * feel cornered:
 *
 *   evidence       something that can be checked by someone else
 *   interpretation a reading. Useful, unfalsifiable on its own, never a fact
 *   operational    where a person is exposed: routine, funding, employer, free time, how
 *                  long they can be worn down
 *
 * Operational questions are allowed, because sometimes you genuinely need to know whether
 * someone can keep this up for a year. But each one has to answer a second question: what
 * decision would change if this were different? An exposure gathered without a decision
 * attached is just a dossier, and a dossier about a private person is not analysis.
 *
 * And the layer will not produce a conclusion until five alternative explanations, at least
 * one piece of disconfirming evidence, and at least one provenance item exist. That is not
 * decoration. It is the difference between "I think they did this because" and a finding.
 *
 * No network, no model, no clock of its own.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.IDLFLayer24 = api;
})(typeof self !== "undefined" ? self : this, function () {
  const KINDS = ["evidence", "interpretation", "operational"];

  const SECTIONS = [
    { id: "act", title: "The act", blurb: "What happened, before any explanation of it." },
    { id: "enablers", title: "Enablers", blurb: "Who or what makes the act possible, and what it costs them to keep enabling it." },
    { id: "endurance", title: "Endurance", blurb: "Whether this continues when you stop responding." },
    { id: "interior", title: "Values and temperament", blurb: "How they decide, not what you would decide." },
    { id: "friction", title: "Where the story pulls", blurb: "Cognitive dissonance, and the places a story gets thinner." },
    { id: "readings", title: "Readings", blurb: "Interpretations, labelled as such." },
    { id: "alternatives", title: "Alternative explanations", blurb: "Five, before any conclusion is allowed." },
    { id: "disconfirming", title: "Disconfirming evidence", blurb: "What would prove you wrong, stated in advance." },
    { id: "provenance", title: "Provenance", blurb: "Chain of custody, witness reliability, gaps." },
    { id: "frame", title: "Your frame", blurb: "Your goals and your appetite for risk. These decide everything above." },
  ];

  const QUESTIONS = [
    // -- act ------------------------------------------------------------------
    { id: "act-what", section: "act", kind: "evidence", text: "What did they do, described so precisely that someone who disagrees with you would still accept the description?" },
    { id: "act-when", section: "act", kind: "evidence", text: "When did it happen, and what in the record fixes the time rather than your memory of it?" },
    { id: "act-method", section: "act", kind: "evidence", text: "By what method, and is the method evidence about intent or only about capability?" },
    { id: "act-caused-by", section: "act", kind: "interpretation", text: "What you think caused it. Mark this as a hypothesis, not a fact." },

    // -- enablers -------------------------------------------------------------
    { id: "enable-who", section: "enablers", kind: "evidence", text: "Who else makes this possible, and what do they get from it continuing?" },
    { id: "enable-funding", section: "enablers", kind: "operational", text: "Who funds them, to the extent that funding is visible without looking into private matters?" },
    { id: "enable-employment", section: "enablers", kind: "operational", text: "Is their job public-facing, and does the role explain access they would otherwise have to get?" },
    { id: "enable-routine", section: "enablers", kind: "operational", text: "What in their routine is relevant to whether this can continue, rather than merely interesting to know?" },
    { id: "enable-cost", section: "enablers", kind: "interpretation", text: "What would it cost an enabler to stop, and who absorbs that cost?" },

    // -- endurance ------------------------------------------------------------
    { id: "endure-persistence", section: "endurance", kind: "operational", text: "How persistent has this been over time, measured in what actually happened rather than in how it felt?" },
    { id: "endure-what-stops", section: "endurance", kind: "evidence", text: "What has already made it pause, and what was different about those moments?" },
    { id: "endure-time", section: "endurance", kind: "operational", text: "How much free time do they appear to have for this, and does the pattern need that much time to persist?" },

    // -- interior -------------------------------------------------------------
    { id: "interior-values", section: "interior", kind: "interpretation", text: "What values would make this behaviour coherent from the inside, and what values would make it incoherent?" },
    { id: "interior-calculated", section: "interior", kind: "interpretation", text: "Is the behaviour calculated or reactive? What would look different if it were the other one?" },
    { id: "interior-patience", section: "interior", kind: "interpretation", text: "Patient or impulsive? Evidence for each, side by side." },
    { id: "interior-dissonance", section: "interior", kind: "interpretation", text: "Where does cognitive dissonance bite for them? What would they have to stop believing to keep doing this?" },
    { id: "interior-guarding", section: "interior", kind: "interpretation", text: "Are they guarding something, or simply being unpleasant? Write both and keep the one the evidence supports." },

    // -- friction -------------------------------------------------------------
    { id: "friction-thin", section: "friction", kind: "evidence", text: "Where does their account get thin, change, or acquire detail it did not have the first time?" },
    { id: "friction-motive-gap", section: "friction", kind: "interpretation", text: "What is the gap between the motive they state and the effort they are spending?" },

    // -- readings -------------------------------------------------------------
    { id: "read-guarding", section: "readings", kind: "interpretation", text: "Your current reading of their intent, in one sentence, with a confidence you would defend." },

    // -- alternatives ---------------------------------------------------------
    { id: "alt-1", section: "alternatives", kind: "evidence", text: "Alternative explanation 1: the most boring explanation consistent with the facts." },
    { id: "alt-2", section: "alternatives", kind: "evidence", text: "Alternative explanation 2: an explanation in which you are partly wrong." },
    { id: "alt-3", section: "alternatives", kind: "evidence", text: "Alternative explanation 3: an explanation in which nobody is at fault, only misaligned." },
    { id: "alt-4", section: "alternatives", kind: "evidence", text: "Alternative explanation 4: an explanation in which their behaviour is a response to yours." },
    { id: "alt-5", section: "alternatives", kind: "evidence", text: "Alternative explanation 5: the explanation you would prefer not to consider." },

    // -- disconfirming --------------------------------------------------------
    { id: "disconfirm-1", section: "disconfirming", kind: "evidence", text: "What evidence, if you found it, would prove your conclusion wrong? State it before you look." },
    { id: "disconfirm-2", section: "disconfirming", kind: "evidence", text: "What have you already seen that points the other way, and why did you discount it?" },

    // -- provenance -----------------------------------------------------------
    { id: "custody-1", section: "provenance", kind: "evidence", text: "Chain of custody: who held this material, in what form, and what changed hands between the event and you?" },
    { id: "custody-2", section: "provenance", kind: "evidence", text: "Witness reliability: who told you, what did they stand to gain, and have they been consistent over time?" },
    { id: "custody-3", section: "provenance", kind: "evidence", text: "What is second-hand but being treated as if you saw it yourself?" },
    { id: "gaps-1", section: "provenance", kind: "evidence", text: "Where is the record silent, and does the silence have an innocent explanation you have ruled out?" },

    // -- frame ----------------------------------------------------------------
    { id: "frame-goals", section: "frame", kind: "evidence", text: "What are your goals here? Name the outcome you actually want, not the feeling you want to have." },
    { id: "frame-risk", section: "frame", kind: "evidence", text: "What risk are you willing to take, and what are you not willing to do even if it would work?" },
    { id: "frame-mirror", section: "frame", kind: "interpretation", text: "Mirror test: what is your contribution to this, and what would you be doing in their position?" },
  ];

  const GATE = { alternatives: 5, disconfirming: 1, provenance: 1 };

  const isAnswered = (answers, id) => {
    const value = answers ? answers[id] : null;
    const text = value && typeof value === "object" ? value.text ?? value.value : value;
    return typeof text === "string" && text.trim().length > 0;
  };

  const idsOf = (predicate) => QUESTIONS.filter(predicate).map((question) => question.id);

  /**
   * A conclusion needs more than a filled-in form. This is the part that stops the layer from
   * laundering a first impression into a finding.
   */
  function assess(answers) {
    const missing = [];
    const alternatives = idsOf((q) => q.section === "alternatives").filter((id) => isAnswered(answers, id));
    const disconfirming = idsOf((q) => q.section === "disconfirming").filter((id) => isAnswered(answers, id));
    const provenance = idsOf((q) => q.section === "provenance").filter((id) => isAnswered(answers, id));

    if (alternatives.length < GATE.alternatives) missing.push(`${GATE.alternatives} alternative explanations (${alternatives.length} so far)`);
    if (disconfirming.length < GATE.disconfirming) missing.push("one piece of disconfirming evidence, stated in advance");
    if (provenance.length < GATE.provenance) missing.push("at least one provenance item: custody, witness or a named gap");
    if (!isAnswered(answers, "frame-goals")) missing.push("your own goal, stated as an outcome");
    if (!isAnswered(answers, "frame-risk")) missing.push("the risk you are willing to take, and what you will not do");

    // An exposure without a decision attached is a dossier rather than analysis.
    const unjustified = QUESTIONS.filter((q) => q.kind === "operational" && isAnswered(answers, q.id) && !isAnswered(answers, "why-" + q.id)).map((q) => q.id);

    const warnings = [];
    if (isAnswered(answers, "read-guarding") && disconfirming.length === 0) {
      warnings.push("a reading of motive is recorded with nothing that could falsify it");
    }
    if (isAnswered(answers, "interior-guarding") && disconfirming.length === 0) {
      warnings.push("a guess at character is standing in for evidence of intent");
    }
    if (alternatives.length > 0 && !isAnswered(answers, "alt-5")) {
      warnings.push("the fifth alternative is the one you would rather not consider, and it is missing");
    }

    return {
      ready: missing.length === 0,
      missing,
      unjustified,
      warnings,
      answered: QUESTIONS.filter((q) => isAnswered(answers, q.id)).length,
      total: QUESTIONS.length,
    };
  }

  /** Evidence discipline first, exposures last, so a form cannot be filled in by mood. */
  function nextQuestion(answers) {
    const order = ["evidence", "interpretation", "operational"];
    for (const kind of order) {
      const found = QUESTIONS.find((q) => q.kind === kind && !isAnswered(answers, q.id));
      if (found) return found;
    }
    return null;
  }

  function operationalPrompts() {
    return QUESTIONS.filter((q) => q.kind === "operational").map((q) => ({
      id: q.id,
      text: q.text,
      needs: "why-" + q.id,
      needsText: "What decision changes if this answer is different? If nothing changes, do not collect it.",
    }));
  }

  return { KINDS, SECTIONS, QUESTIONS, GATE, assess, nextQuestion, operationalPrompts, isAnswered, describe: () => "A conclusion opens only after five alternatives, one disconfirming item and one provenance item. Exposures need a decision attached." };
});
