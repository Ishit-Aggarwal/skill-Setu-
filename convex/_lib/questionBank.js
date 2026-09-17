/**
 * The graded question bank — SERVER ONLY.
 *
 * This file holds the answer keys, so it must never reach the browser. It
 * lives under convex/_lib (not registered as a Convex function, not bundled
 * into the Next.js client) and is read only by the grading mutation. The
 * client gets question text and options from a query that strips `correct`.
 *
 * Ten domains, assessed the same way for every student: four universal
 * aptitude axes, four AYUSH professional competencies (research & clinical
 * documentation, digital health, practice management & regulation, health
 * data), and two applied axes — ASU&H clinical fundamentals and herbal drug
 * quality / GMP / pharmacognosy. Which of these a given student is actually
 * charted and scored on is decided by lib/taxonomy.js from their own
 * department — no student is assessed on a rubric that isn't theirs.
 */

import { SKILL_DOMAINS } from "../../lib/questionBank";

export const QUESTION_BANK = {
  /* ---------- Core Universal Employability Domains ---------- */
  "Quantitative Aptitude": [
    { question: "A Panchakarma centre treats 60 patients in 45 minutes of registration time. At the same rate, how many are registered per hour?", options: ["60", "75", "80", "90"], correct: 2 },
    { question: "What is 15% of 240 ml of a medicated oil (taila)?", options: ["30 ml", "36 ml", "40 ml", "24 ml"], correct: 1 },
    { question: "The average daily OPD count over 5 days at an Ayurveda dispensary is 20. If one day is removed, the average of the remaining 4 becomes 18. What was the removed day's count?", options: ["24", "28", "30", "32"], correct: 1 },
    { question: "An Ayurvedic pharmacy marks up a churna by 25% and then gives a 20% discount on the marked price. What is the net effect?", options: ["5% profit", "No profit, no loss", "5% loss", "10% profit"], correct: 1 },
    { question: "Simplify: 2/3 + 1/6 (a decoction dilution ratio)", options: ["5/6", "1/2", "3/9", "1"], correct: 0 },
  ],
  "Logical Reasoning": [
    { question: "Find the odd one out.", options: ["Ashwagandha", "Brahmi", "Ghee", "Shatavari"], correct: 2 },
    { question: "All Bloops are Razzles. All Razzles are Lazzles. Are all Bloops definitely Lazzles?", options: ["Yes", "No", "Cannot be determined", "Only sometimes"], correct: 0 },
    { question: "Complete the series: 2, 6, 12, 20, 30, ?", options: ["40", "42", "36", "38"], correct: 1 },
    { question: "A is taller than B. C is shorter than B. Who is the shortest?", options: ["A", "B", "C", "Cannot be determined"], correct: 2 },
    { question: "Which number should replace the question mark: 3, 9, 27, 81, ?", options: ["162", "243", "324", "729"], correct: 1 },
  ],
  "Verbal Communication": [
    { question: "Choose the correctly spelled word.", options: ["Recieve", "Receive", "Receeve", "Receve"], correct: 1 },
    { question: "Choose the synonym of 'Meticulous'.", options: ["Careless", "Thorough", "Hasty", "Vague"], correct: 1 },
    { question: "Choose the antonym of 'Abundant'.", options: ["Plentiful", "Scarce", "Ample", "Generous"], correct: 1 },
    { question: "Fill in the blank: \"She has been practising at the AYUSH wellness centre ___ 2019.\"", options: ["since", "for", "from", "at"], correct: 0 },
    { question: "Which sentence is correctly punctuated?", options: ["Its a great day.", "It's a great day.", "Its' a great day.", "It is' a great day."], correct: 1 },
  ],
  "AYUSH Digital Health & Telemedicine": [
    { question: "Which national teleconsultation service runs a dedicated AYUSH OPD for online consultations with Ayurveda, Yoga, Unani, Siddha and Homoeopathy practitioners?", options: ["DigiLocker", "eSanjeevani", "UMANG", "CoWIN"], correct: 1 },
    { question: "The Ayush Grid initiative of the Ministry of AYUSH aims to:", options: ["Build a unified IT backbone for the AYUSH sector — digital health records, telemedicine, education and research", "Distribute free medicines by post", "Run a chain of spa resorts", "Print pharmacopoeia volumes"], correct: 0 },
    { question: "Under the Ayushman Bharat Digital Mission (ABDM), the ABHA number is:", options: ["A drug manufacturing licence", "A prescription format", "A unique health ID that links a person's digital health records", "A yoga certification"], correct: 2 },
    { question: "In digital health, 'interoperability' means:", options: ["Software runs only on one device", "Different systems can exchange and use health data consistently", "Records are stored on paper", "All doctors share one login"], correct: 1 },
    { question: "The NAMASTE portal (National AYUSH Morbidity and Standardized Terminologies Electronic) is used for:", options: ["Booking spa appointments", "Exporting herbal products", "Student admissions", "Standardised coding of AYUSH morbidity and diagnostic terminologies"], correct: 3 },
  ],
  "Problem Solving & Critical Thinking": [
    { question: "A patient reports an unexpected reaction midway through a Panchakarma course. What is the recommended first step?", options: ["Continue as planned until the course ends", "Stop the procedure, assess symptoms, document them and escalate to the treating physician", "Blame the therapist", "Wait for the patient to complain again"], correct: 1 },
    { question: "Which cognitive bias describes relying heavily on the first piece of information encountered?", options: ["Confirmation bias", "Anchoring bias", "Hindsight bias", "Availability heuristic"], correct: 1 },
    { question: "An AYUSH health camp has a fixed date and more registrations than the team can screen. What is the sound response?", options: ["Ask the team to work 18-hour days", "Prioritise by clinical need, negotiate scope with the organisers and schedule follow-ups", "Cancel the camp on the day", "Skip documentation to move faster"], correct: 1 },
    { question: "In root cause analysis, which technique asks 'Why?' iteratively to reach the source issue?", options: ["Pareto Principle", "5 Whys technique", "Monte Carlo simulation", "Six Sigma Black Belt"], correct: 1 },
    { question: "What is the primary difference between correlation and causation?", options: ["They mean the exact same thing", "Correlation indicates a relationship; causation proves one variable directly triggers the other", "Causation applies only in physics", "Correlation requires a laboratory"], correct: 1 },
  ],
  "AYUSH Practice Management & Ethics": [
    { question: "Registration of Ayurveda, Unani, Siddha and Sowa-Rigpa practitioners in India is regulated by:", options: ["National Medical Commission (NMC)", "National Commission for Indian System of Medicine (NCISM)", "Pharmacy Council of India", "Dental Council of India"], correct: 1 },
    { question: "Which body regulates homoeopathic education and practitioner registration in India?", options: ["NCISM", "AICTE", "National Commission for Homoeopathy (NCH)", "NMC"], correct: 2 },
    { question: "The 'AYUSH Premium Mark' is:", options: ["A voluntary quality certification for AYUSH products, particularly for export markets", "A scholarship scheme", "A hospital rating", "A yoga competition award"], correct: 0 },
    { question: "A patient's clinical records at an AYUSH hospital should be:", options: ["Posted publicly for research", "Discarded after each visit", "Shared freely with pharmaceutical companies", "Kept confidential and shared only with consent or as the law requires"], correct: 3 },
    { question: "The National AYUSH Mission (NAM) is a centrally sponsored scheme that primarily:", options: ["Regulates allopathic drug pricing", "Strengthens AYUSH hospitals, colleges, drug quality control and medicinal-plant cultivation through the States/UTs", "Runs national entrance exams for engineering", "Funds IT parks"], correct: 1 },
  ],
  "Data Analysis & Interpretation": [
    { question: "Which metric is least affected by extreme outliers in a skewed dataset of patient recovery times?", options: ["Mean", "Median", "Standard deviation", "Variance"], correct: 1 },
    { question: "What chart type is best suited for showing the share of OPD visits across the 3–4 AYUSH systems at a hospital?", options: ["Scatter plot", "Donut / Pie chart", "Candlestick chart", "Gantt chart"], correct: 1 },
    { question: "In a comparison of two Yoga protocols, a statistically significant result typically means:", options: ["The result happened purely by chance", "The observed difference is unlikely to be due to random variation", "Every participant preferred protocol B", "No further study is ever needed"], correct: 1 },
    { question: "What does a high positive correlation coefficient (+0.88) indicate between adherence to a Pathya diet (X) and symptom improvement (Y)?", options: ["As X increases, Y tends to increase", "As X increases, Y tends to decrease", "There is zero relationship", "X causes Y directly"], correct: 0 },
    { question: "Which of these is a categorical (qualitative) variable?", options: ["Dispensary revenue", "Patient's Prakriti type (Vata / Pitta / Kapha)", "Years of practice", "Consultation duration in minutes"], correct: 1 },
  ],
  "AYUSH Research & Clinical Documentation": [
    { question: "Before enrolling the first participant, an AYUSH clinical trial in India must be registered with:", options: ["Clinical Trials Registry – India (CTRI)", "The institution's library", "The state drug controller only", "No registry is required"], correct: 0 },
    { question: "Informed consent in human participant studies must always be:", options: ["Verbal only", "Documented, voluntary, and revocable at any time", "Signed by the investigator alone", "Obtained after publication"], correct: 1 },
    { question: "In a randomised controlled trial of a Panchakarma protocol, the purpose of the control group is to:", options: ["Increase the cost of the trial", "Guarantee a positive result", "Separate the effect of the intervention from natural recovery and expectation", "Avoid ethics-committee review"], correct: 2 },
    { question: "A Case Record Form (CRF) in a clinical study is used to:", options: ["Advertise the trial", "Capture each participant's protocol-required data in a standard format", "Replace informed consent", "Record only adverse events"], correct: 1 },
    { question: "Which of these constitutes proper citation practice when quoting a Samhita commentary or a journal paper?", options: ["Paraphrasing without attributing the author", "Using exact quotes with quotation marks, author citation, and page/link", "Only citing websites, never classical texts", "Omitting sources if found on social media"], correct: 1 },
  ],

  /* ---------- Applied AYUSH domains ---------- */
  "ASU&H Clinical Fundamentals": [
    { question: "In Ayurveda, the three doshas that govern physiological function are:", options: ["Vata, Pitta, Kapha", "Rasa, Rakta, Mamsa", "Sattva, Rajas, Tamas", "Agni, Ama, Ojas"], correct: 0 },
    { question: "Which classical Ayurvedic text is primarily associated with surgery (Shalya Tantra)?", options: ["Charaka Samhita", "Sushruta Samhita", "Ashtanga Hridaya", "Madhava Nidana"], correct: 1 },
    { question: "In Unani medicine, the four humours (Akhlat) are Dam, Balgham, Safra and:", options: ["Ruh", "Mizaj", "Sauda", "Quwa"], correct: 2 },
    { question: "The foundational principle of Homoeopathy, 'Similia Similibus Curentur', means:", options: ["Opposites cure", "Like cures like", "The minimum dose is the maximum", "Disease is dosha imbalance"], correct: 1 },
    { question: "In Siddha medicine, 'Mukkutram' refers to the three humours Vatham, Pitham and:", options: ["Kabam", "Rasam", "Ojas", "Sauda"], correct: 0 },
  ],
  "Herbal Drug Quality, GMP & Pharmacognosy": [
    { question: "GMP requirements for Ayurveda, Siddha and Unani drug manufacturing in India are laid down under which schedule of the Drugs and Cosmetics Rules, 1945?", options: ["Schedule M", "Schedule T", "Schedule Y", "Schedule H"], correct: 1 },
    { question: "Which official monograph collection sets quality standards for single drugs and formulations of Ayurveda in India?", options: ["Indian Pharmacopoeia (IP)", "British Pharmacopoeia", "Ayurvedic Pharmacopoeia of India (API)", "Homoeopathic Pharmacopoeia of India"], correct: 2 },
    { question: "HPTLC fingerprinting is used in ASU drug quality control primarily to:", options: ["Establish the identity and batch-to-batch consistency of a herbal raw material or formulation", "Measure tablet hardness", "Determine shelf-life by accelerated heating", "Count microbial colonies"], correct: 0 },
    { question: "Which heavy-metal limit test is routinely mandated for ASU formulations before release?", options: ["Sodium and potassium", "Calcium and magnesium", "Iron and zinc", "Lead, arsenic, mercury and cadmium"], correct: 3 },
    { question: "In Rasashastra, a 'Bhasma' is:", options: ["A fermented herbal decoction", "A calcined (incinerated) metal or mineral preparation", "A medicated oil", "A herbal powder mixed with honey"], correct: 1 },
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
