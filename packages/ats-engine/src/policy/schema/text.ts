import { z } from "zod";

import { wordList } from "../primitives.js";

/**
 * Text-shape vocabulary the scorer itself reads, as opposed to the parser or the matcher.
 *
 * `contentLineVerbs` decides which lines count as substantive content — the denominator both
 * ratio metrics divide by. It is a list of English verbs, so it is data; it was previously a
 * literal in the scorer, which is exactly the kind of thing that turns adding a locale into a
 * rewrite.
 *
 * Deliberately its own field rather than reusing the `actionVerbRatio` rule's pattern. The two
 * lists overlap but are not the same list and never were: this one decides what gets measured,
 * that one decides what scores well, and quietly collapsing them would change which lines are
 * counted. The default below is the exact list this replaced, so a policy that does not mention
 * the field behaves identically to the code that came before it.
 */
export const engineTextSchema = z
  .object({
    contentLineVerbs: wordList("text.contentLineVerbs").default([
      "managed",
      "led",
      "built",
      "developed",
      "designed",
      "improved",
      "reduced",
      "increased",
      "delivered",
      "achieved",
      "created",
      "generated",
      "optimized",
      "launched",
      "spearheaded",
      "engineered",
      "maintained",
      "scaled",
      "automated",
    ]),
    /**
     * The verbs a content line scores for opening with, read by an `actionVerbRatio` rule that
     * carries no `pattern` of its own. Vocabulary rather than a pattern in the rule, so a
     * language pack extends it the way it extends every other word list.
     */
    actionVerbs: wordList("text.actionVerbs").default([
      "led",
      "built",
      "designed",
      "delivered",
      "improved",
      "reduced",
      "increased",
      "created",
      "launched",
      "managed",
      "developed",
      "automated",
      "scaled",
      "migrated",
      "owned",
    ]),
    /**
     * Whether an action verb counts anywhere in a line rather than only in its opening words.
     * Set for a verb-final language: in Hindi "टीम का नेतृत्व किया" the verb ends the bullet.
     */
    actionVerbAnywhere: z.boolean().default(false),
    /**
     * Instructions addressed to an AI screener rather than to a person. Patterns, so each can
     * cover its variants; a tool's name alone is never one ("Built with the ChatGPT API" is a
     * skill). Language packs add their own.
     */
    injectionPhrases: wordList("text.injectionPhrases").default([
      // Up to three determiners: "ignore all the previous", "disregard all of the above".
      String.raw`(?:ignore|disregard|forget|override)\s+(?:(?:all|any|the|your|of|my|these|those)\s+){0,3}(?:previous|prior|above|earlier|preceding|other)\s+(?:instructions?|prompts?|directions?|rules|context)`,
      // Not "system prompt:", which an engineer writes about the prompts they built.
      String.raw`(?:new|updated|real)\s+(?:instructions?|prompt)\s*:|system\s+instructions?\s*:`,
      String.raw`(?:you\s+are|pretend\s+to\s+be)\s+(?:an?\s+)?(?:ai|assistant|language\s+model|llm|recruiter|hiring\s+manager|resume\s+screener)`,
      // "Act as" is a recruiter's job description ("act as hiring manager"), so it counts only
      // with an AI for its object.
      String.raw`act\s+as\s+(?:an?\s+)?(?:(?:ai|automated)\s+(?:assistant|recruiter|screener|reviewer|hiring\s+manager|model)|language\s+model|llm|resume\s+screener)`,
      String.raw`(?:if|when)\s+you\s+are\s+(?:an?\s+)?(?:ai|llm|language\s+model|automated|bot)`,
      // Addressed, so punctuated: "Note to AI:", not "the release note for the model registry".
      String.raw`note\s+(?:to|for)\s+(?:the\s+)?(?:ai|llm|chatgpt|model|screener|automated\s+\p{L}+)\s*[:,–—-]`,
      // "This candidate", never "the candidate": a recruiter's bullets talk about *the*
      // candidate ("ensured the candidate is the best fit"); an instruction points at this one.
      String.raw`(?:rank|rate|score|grade|mark|recommend|evaluate)\s+this\s+(?:candidate|applicant|resume|profile)\s+(?:as\s+|at\s+)?(?:the\s+)?(?:highest|top|best|first|100|10|perfect|excellent|highly)`,
      String.raw`this\s+(?:candidate|applicant)\s+(?:is|should\s+be)\s+(?:the\s+|an?\s+)?(?:best|most\s+qualified|perfect|ideal|top|strongest|exceptional)\s+(?:fit|match|candidate|choice)`,
      String.raw`(?:hire|shortlist|advance|select|interview)\s+this\s+(?:candidate|applicant)\s+(?:immediately|now|first|without)`,
      // Not a measure: "output with 100% accuracy", "answer with 100% first-contact resolution".
      String.raw`(?:respond|reply|answer|output)\s+(?:only\s+)?with\s+["'“]?(?:yes|hire|qualified|100)(?!\s*%)`,
      // A markdown "### System Design" heading is not a prompt delimiter; "### System:" is.
      String.raw`<\|?(?:im_start|system|endoftext)\|?>|\[/?(?:inst|system)\]|###\s*(?:instructions?|system\s*:)`,
    ]),
  })
  // `prefault`, not `default`: zod 4's `default` returns the fallback as-is without parsing it,
  // which would hand the scorer `{}` and silently drop the verb list above.
  .prefault({});
