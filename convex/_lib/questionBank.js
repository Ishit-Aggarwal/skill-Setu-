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
 * consulting, management, design and health sciences, plus two AYUSH-specific
 * domains for the clinical streams. Which of these a given student is actually
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

  /* ---------- AYUSH domains — assessed by default, not an opt-in track ---------- */
  "Ayurveda & Panchakarma": [
    { question: "The three doshas described in Ayurveda are:", options: ["Vata, Pitta, Kapha", "Rasa, Rakta, Mamsa", "Sattva, Rajas, Tamas", "Prana, Udana, Samana"], correct: 0 },
    { question: "Which classical text is attributed primarily to surgical practice (Shalya Tantra)?", options: ["Charaka Samhita", "Sushruta Samhita", "Ashtanga Hridaya", "Madhava Nidana"], correct: 1 },
    { question: "Which of these is NOT one of the five classical Panchakarma procedures?", options: ["Vamana", "Virechana", "Abhyanga", "Basti"], correct: 2 },
    { question: "Snehana and Swedana are performed as part of:", options: ["Purvakarma (preparatory)", "Pradhanakarma (main)", "Paschatkarma (post-therapy)", "Rasayana"], correct: 0 },
    { question: "'Agni' in Ayurvedic physiology most closely refers to:", options: ["Body temperature", "Digestive and metabolic capacity", "Circulatory force", "Mental clarity"], correct: 1 },
  ],
  "Yoga, Unani, Siddha & Homeopathy": [
    { question: "In Patanjali's Ashtanga Yoga, 'Pratyahara' means:", options: ["Breath regulation", "Withdrawal of the senses", "Ethical restraint", "Meditative absorption"], correct: 1 },
    { question: "Which pranayama is generally indicated for cooling the body?", options: ["Bhastrika", "Kapalabhati", "Sheetali", "Surya Bhedana"], correct: 2 },
    { question: "The four humours (Akhlat) in Unani medicine are:", options: ["Dam, Balgham, Safra, Sauda", "Vata, Pitta, Kapha, Rakta", "Prithvi, Ap, Tejas, Vayu", "Ojas, Tejas, Prana, Rasa"], correct: 0 },
    { question: "In Siddha, the 96 Thathuvas describe:", options: ["Herbal formulations", "Constituent principles of the human being", "Surgical instruments", "Pulse types"], correct: 1 },
    { question: "The central principle of homeopathy is:", options: ["Contraria contrariis curentur", "Similia similibus curentur", "Primum non nocere", "Ars longa, vita brevis"], correct: 1 },
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
  const breakdown = questions.map((q, index) => {
    const chosen = Number.isInteger(responses[index]) ? responses[index] : null;
    return {
      index,
      question: q.question,
      chosen,
      correctOption: q.correct,
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
