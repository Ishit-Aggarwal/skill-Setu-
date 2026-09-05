/**
 * The graded question bank — SERVER ONLY.
 *
 * This file holds the answer keys, so it must never reach the browser. It
 * lives under convex/_lib (not registered as a Convex function, not bundled
 * into the Next.js client) and is read only by the grading mutation. The
 * client gets question text and options from a query that strips `correct`.
 *
 * Ten domains, assessed the same way for every student: eight general
 * employability competencies screened across technology, engineering,
 * consulting, management, design and health sciences, plus two faculty-specific
 * domains for the science and design streams. Which of these a given student is actually
 * charted and scored on is decided by lib/taxonomy.js from their own
 * department — no student is assessed on a rubric that isn't theirs.
 */

import { SKILL_DOMAINS } from "../../lib/questionBank";

export const QUESTION_BANK = {
  /* ---------- Core Universal Employability Domains ---------- */
  "Quantitative Aptitude": [
    { question: "If a train travels 60 km in 45 minutes, what is its speed in km/h?", options: ["60", "75", "80", "90"], correct: 2 },
    { question: "What is 15% of 240?", options: ["30", "36", "40", "24"], correct: 1 },
    { question: "The average of 5 numbers is 20. If one number is removed, the average of the remaining 4 becomes 18. What was the removed number?", options: ["24", "28", "30", "32"], correct: 1 },
    { question: "A shopkeeper marks up a product by 25% and then gives a 20% discount on the marked price. What is the net effect?", options: ["5% profit", "No profit, no loss", "5% loss", "10% profit"], correct: 1 },
    { question: "Simplify: 2/3 + 1/6", options: ["5/6", "1/2", "3/9", "1"], correct: 0 },
  ],
  "Logical Reasoning": [
    { question: "Find the odd one out.", options: ["Apple", "Banana", "Carrot", "Mango"], correct: 2 },
    { question: "All Bloops are Razzles. All Razzles are Lazzles. Are all Bloops definitely Lazzles?", options: ["Yes", "No", "Cannot be determined", "Only sometimes"], correct: 0 },
    { question: "Complete the series: 2, 6, 12, 20, 30, ?", options: ["40", "42", "36", "38"], correct: 1 },
    { question: "A is taller than B. C is shorter than B. Who is the shortest?", options: ["A", "B", "C", "Cannot be determined"], correct: 2 },
    { question: "Which number should replace the question mark: 3, 9, 27, 81, ?", options: ["162", "243", "324", "729"], correct: 1 },
  ],
  "Verbal Communication": [
    { question: "Choose the correctly spelled word.", options: ["Recieve", "Receive", "Receeve", "Receve"], correct: 1 },
    { question: "Choose the synonym of 'Meticulous'.", options: ["Careless", "Thorough", "Hasty", "Vague"], correct: 1 },
    { question: "Choose the antonym of 'Abundant'.", options: ["Plentiful", "Scarce", "Ample", "Generous"], correct: 1 },
    { question: "Fill in the blank: \"She has been working here ___ 2019.\"", options: ["since", "for", "from", "at"], correct: 0 },
    { question: "Which sentence is correctly punctuated?", options: ["Its a great day.", "It's a great day.", "Its' a great day.", "It is' a great day."], correct: 1 },
  ],
  "Programming & Digital Fundamentals": [
    { question: "What does 'API' stand for?", options: ["Application Programming Interface", "Advanced Program Integration", "Applied Programming Interface", "Automated Program Instruction"], correct: 0 },
    { question: "Which data structure follows First-In-First-Out (FIFO)?", options: ["Stack", "Queue", "Tree", "Graph"], correct: 1 },
    { question: "What is the time complexity of binary search on a sorted list of n items?", options: ["O(n)", "O(log n)", "O(n^2)", "O(1)"], correct: 1 },
    { question: "In a relational database, what does a single row in a table typically represent?", options: ["A function", "A single record", "A loop", "A variable"], correct: 1 },
    { question: "Which SQL clause filters rows before grouping?", options: ["HAVING", "WHERE", "ORDER BY", "LIMIT"], correct: 1 },
  ],
  "Problem Solving & Critical Thinking": [
    { question: "When resolving an unexpected system outage, what is the recommended first step?", options: ["Blame the last committer", "Identify symptoms, scope impact and isolate recent changes", "Restart all infrastructure without logging", "Wait for users to complain"], correct: 1 },
    { question: "Which cognitive bias describes relying heavily on the first piece of information encountered?", options: ["Confirmation bias", "Anchoring bias", "Hindsight bias", "Availability heuristic"], correct: 1 },
    { question: "A team has a hard 2-week deadline and scope exceeds capacity. What is the standard Agile response?", options: ["Force team to work 18-hour days", "Negotiate scope down with stakeholders and prioritize core value", "Cancel the project immediately", "Deliver untested code silently"], correct: 1 },
    { question: "In root cause analysis, which technique asks 'Why?' iteratively to reach the source issue?", options: ["Pareto Principle", "5 Whys technique", "Monte Carlo simulation", "Six Sigma Black Belt"], correct: 1 },
    { question: "What is the primary difference between correlation and causation?", options: ["They mean the exact same thing", "Correlation indicates a relationship; causation proves one variable directly triggers the other", "Causation applies only in physics", "Correlation requires a laboratory"], correct: 1 },
  ],
  "Business & Professional Dynamics": [
    { question: "In a professional email, what does 'CC' typically mean?", options: ["Carbon Copy", "Central Copy", "Confirm Copy", "Copy Content"], correct: 0 },
    { question: "What is the first step in effective active listening?", options: ["Interrupting to clarify", "Giving full attention to the speaker", "Preparing your response while they talk", "Checking your phone"], correct: 1 },
    { question: "In a SWOT analysis, what does the 'O' stand for?", options: ["Objectives", "Opportunities", "Outcomes", "Operations"], correct: 1 },
    { question: "What is the primary purpose of a KPI (Key Performance Indicator)?", options: ["To decorate reports", "To measure progress toward an objective", "To replace employee reviews", "To set office rules"], correct: 1 },
    { question: "Which of these represents good practice when concluding a client or stakeholder meeting?", options: ["Leaving immediately without summary", "Reiterating agreed action items, owners, and due dates", "Avoiding written follow-ups", "Changing agreed commitments unilaterally"], correct: 1 },
  ],
  "Data Analysis & Interpretation": [
    { question: "Which metric is least affected by extreme outliers in a skewed dataset?", options: ["Mean", "Median", "Standard deviation", "Variance"], correct: 1 },
    { question: "What chart type is best suited for showing proportions of a whole across 3–4 categories?", options: ["Scatter plot", "Donut / Pie chart", "Candlestick chart", "Gantt chart"], correct: 1 },
    { question: "In A/B testing, a statistically significant result typically means:", options: ["The result happened purely by chance", "The observed difference is unlikely due to random variation", "Every user preferred option B", "No further testing is ever needed"], correct: 1 },
    { question: "What does a high positive correlation coefficient (+0.88) indicate between variables X and Y?", options: ["As X increases, Y tends to increase", "As X increases, Y tends to decrease", "There is zero relationship", "X causes Y directly"], correct: 0 },
    { question: "Which of these is a categorical (qualitative) variable?", options: ["Annual revenue", "Employee department", "Years of experience", "Server response time"], correct: 1 },
  ],
  "Research & Documentation": [
    { question: "In formal research, which section provides an exhaustive summary of prior published work on the subject?", options: ["Literature Review", "Executive Summary only", "Appendix B", "Budget justification"], correct: 0 },
    { question: "Informed consent in human participant studies must always be:", options: ["Verbal only", "Documented, voluntary, and revocable at any time", "Signed by the investigator alone", "Obtained after publication"], correct: 1 },
    { question: "A p-value of 0.02 at an alpha level of 0.05 indicates:", options: ["The null hypothesis can be rejected", "The result is inconclusive", "The sample size was too large", "There is a 98% chance of experimental error"], correct: 0 },
    { question: "Which of these constitutes proper citation practice to avoid plagiarism?", options: ["Paraphrasing without attributing the author", "Using exact quotes with quotation marks, author citation, and page/link", "Only citing websites, never academic papers", "Omitting sources if found on social media"], correct: 1 },
    { question: "What is the primary purpose of peer review in scientific publishing?", options: ["To delay publication", "To independently evaluate validity, methodology, and originality", "To market the paper to news outlets", "To check typography only"], correct: 1 },
  ],

  /* ---------- Faculty-specific domains ---------- */
  "Health & Life Sciences": [
    { question: "Which organ system is primarily responsible for gas exchange in the human body?", options: ["Respiratory system", "Endocrine system", "Lymphatic system", "Integumentary system"], correct: 0 },
    { question: "In a controlled clinical study, the purpose of a placebo group is to:", options: ["Increase the size of the treatment effect", "Separate the effect of the intervention from expectation and natural recovery", "Reduce the cost of the trial", "Guarantee statistical significance"], correct: 1 },
    { question: "Incidence and prevalence differ in that incidence measures:", options: ["Total existing cases at one point in time", "New cases arising over a period of time", "Deaths attributable to a disease", "Cases per hospital bed"], correct: 1 },
    { question: "Which practice is the single most effective way to limit infection transmission in a clinical setting?", options: ["Hand hygiene", "Wearing a lab coat", "Keeping windows open", "Daily temperature checks"], correct: 0 },
    { question: "Enzymes increase the rate of a biochemical reaction by:", options: ["Raising the reaction temperature", "Lowering the activation energy", "Shifting the equilibrium position", "Consuming the substrate directly"], correct: 1 },
  ],
  "Design & Visual Thinking": [
    { question: "Visual hierarchy on a screen is established primarily through:", options: ["Alphabetical ordering", "Contrast, scale and spacing", "Using as many colours as possible", "Centring every element"], correct: 1 },
    { question: "A wireframe is best described as:", options: ["A final, pixel-accurate design", "A low-fidelity layout that settles structure and priority before styling", "The production front-end code", "A colour palette specification"], correct: 1 },
    { question: "Which pairing is most likely to fail an accessibility contrast check?", options: ["Near-black text on white", "Light grey text on a white background", "White text on a dark navy background", "Dark green text on a pale background"], correct: 1 },
    { question: "In user research, the point of a usability test is to:", options: ["Confirm that the team's design is correct", "Observe where real users struggle to complete a task", "Collect testimonials for marketing", "Measure page load time"], correct: 1 },
    { question: "Whitespace in a layout is best understood as:", options: ["Wasted area waiting to be filled", "An active tool for grouping, separation and emphasis", "A printing constraint only", "Another name for a white background"], correct: 1 },
  ],
};


/* A rename on either side would silently produce a domain no test can score,
   or an axis with no questions behind it. Fail loudly instead. */
const BANK_DOMAINS = Object.keys(QUESTION_BANK);
const missing = SKILL_DOMAINS.filter((d) => !BANK_DOMAINS.includes(d));
const extra = BANK_DOMAINS.filter((d) => !SKILL_DOMAINS.includes(d));
if (missing.length || extra.length) {
  throw new Error(
    `[questionBank] domain list out of sync — missing: ${missing.join(", ") || "none"}; unexpected: ${
      extra.join(", ") || "none"
    }`
  );
}

/** Questions for a domain with the answer key removed, for the test-taking UI. */
export function publicQuestionsFor(domain) {
  const questions = QUESTION_BANK[domain] || [];
  return questions.map((q, index) => ({ index, question: q.question, options: q.options }));
}

export function questionCountFor(domain) {
  return (QUESTION_BANK[domain] || []).length;
}

/**
 * Marks a submission.  is an array of chosen option indices (or null
 * for unanswered), positionally aligned with publicQuestionsFor(domain).
 */
export function gradeSubmission(domain, answers) {
  const questions = QUESTION_BANK[domain] || [];
  if (!questions.length) return null;

  const responses = Array.isArray(answers) ? answers : [];
  /* The options travel with the breakdown so a review can name what the
     candidate actually picked, rather than "you chose option 3". This is only
     ever returned to the person who has just submitted that paper, whose own
     answers it is; the key stays out of anything served before submission. */
  const breakdown = questions.map((q, index) => {
    const chosen = Number.isInteger(responses[index]) ? responses[index] : null;
    return {
      index,
      question: q.question,
      options: q.options,
      chosen,
      chosenText: chosen == null ? null : q.options[chosen] ?? null,
      correctOption: q.correct,
      correctText: q.options[q.correct] ?? null,
      correct: chosen === q.correct,
    };
  });

  const correctCount = breakdown.filter((b) => b.correct).length;
  return {
    domain,
    correctCount,
    totalQuestions: questions.length,
    score: Math.round((correctCount / questions.length) * 100),
    breakdown,
  };
}
