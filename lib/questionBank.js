/**
 * Question banks powering the online skill tests.
 *
 * Two halves, deliberately. The first five domains are the general
 * aptitude/fundamentals set every campus placement process screens on,
 * whatever the field. The last five are the AYUSH-specific domains an
 * Ayurveda, Yoga & Naturopathy, Unani, Siddha or Homeopathy employer actually
 * assesses — the sector this platform was commissioned for, and one no generic
 * placement portal covers at all.
 */

export const QUESTION_BANK = {
  /* ---------- General aptitude & fundamentals ---------- */
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
  "Verbal Ability": [
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
  "Business & Communication": [
    { question: "In a professional email, what does 'CC' typically mean?", options: ["Carbon Copy", "Central Copy", "Confirm Copy", "Copy Content"], correct: 0 },
    { question: "What is the first step in effective active listening?", options: ["Interrupting to clarify", "Giving full attention to the speaker", "Preparing your response while they talk", "Checking your phone"], correct: 1 },
    { question: "In a SWOT analysis, what does the 'O' stand for?", options: ["Objectives", "Opportunities", "Outcomes", "Operations"], correct: 1 },
    { question: "What is the primary purpose of a KPI (Key Performance Indicator)?", options: ["To decorate reports", "To measure progress toward a goal", "To replace employee reviews", "To set office rules"], correct: 1 },
    { question: "Which of these is good practice in a client meeting?", options: ["Arriving late to show you're busy", "Actively confirming next steps before ending", "Avoiding eye contact", "Speaking only about your own company"], correct: 1 },
  ],

  /* ---------- AYUSH-sector domains ---------- */
  "Ayurveda & Panchakarma": [
    { question: "The three doshas described in Ayurveda are:", options: ["Vata, Pitta, Kapha", "Rasa, Rakta, Mamsa", "Sattva, Rajas, Tamas", "Prana, Udana, Samana"], correct: 0 },
    { question: "Which classical text is attributed primarily to surgical practice (Shalya Tantra)?", options: ["Charaka Samhita", "Sushruta Samhita", "Ashtanga Hridaya", "Madhava Nidana"], correct: 1 },
    { question: "Which of these is NOT one of the five classical Panchakarma procedures?", options: ["Vamana", "Virechana", "Abhyanga", "Basti"], correct: 2 },
    { question: "Snehana and Swedana are performed as part of:", options: ["Purvakarma (preparatory)", "Pradhanakarma (main)", "Paschatkarma (post-therapy)", "Rasayana"], correct: 0 },
    { question: "Samsarjana krama refers to:", options: ["Graded dietary regimen after purification", "Oil massage sequence", "Herb collection sequence", "Pulse examination order"], correct: 0 },
  ],
  "Yoga & Naturopathy": [
    { question: "In Patanjali's Ashtanga Yoga, 'Pratyahara' means:", options: ["Breath regulation", "Withdrawal of the senses", "Ethical restraint", "Meditative absorption"], correct: 1 },
    { question: "Which pranayama is generally indicated for cooling the body?", options: ["Bhastrika", "Kapalabhati", "Sheetali", "Surya Bhedana"], correct: 2 },
    { question: "Hydrotherapy in naturopathy primarily works through:", options: ["Chemical absorption through skin", "Thermal and mechanical stimulation", "Electromagnetic induction", "Nutrient supplementation"], correct: 1 },
    { question: "Which asana is most commonly contraindicated in acute lower-back disc prolapse?", options: ["Tadasana", "Halasana", "Shavasana", "Vajrasana"], correct: 1 },
    { question: "A therapeutic fasting programme in naturopathy is usually broken with:", options: ["A heavy protein meal", "Fruit juice or a light liquid diet", "Fried food to restore calories", "An immediate return to normal diet"], correct: 1 },
  ],
  "Unani, Siddha & Homeopathy": [
    { question: "The four humours (Akhlat) in Unani medicine are:", options: ["Dam, Balgham, Safra, Sauda", "Vata, Pitta, Kapha, Rakta", "Prithvi, Ap, Tejas, Vayu", "Ojas, Tejas, Prana, Rasa"], correct: 0 },
    { question: "'Mizaj' in Unani medicine refers to:", options: ["Diagnosis", "Temperament", "Prescription", "Prognosis"], correct: 1 },
    { question: "In Siddha, the 96 Thathuvas describe:", options: ["Herbal formulations", "Constituent principles of the human being", "Surgical instruments", "Pulse types"], correct: 1 },
    { question: "The central principle of homeopathy is:", options: ["Contraria contrariis curentur", "Similia similibus curentur", "Primum non nocere", "Ars longa, vita brevis"], correct: 1 },
    { question: "A '30C' homeopathic potency indicates:", options: ["30 centesimal dilution steps", "30 grams per dose", "30% concentration", "30 drops per dose"], correct: 0 },
  ],
  "Ayush Pharmacology & Formulation": [
    { question: "'Rasa' in Dravyaguna refers to a drug's:", options: ["Taste", "Potency", "Post-digestive effect", "Specific action"], correct: 0 },
    { question: "Bhasma preparation in Rasashastra primarily involves:", options: ["Cold maceration", "Repeated incineration (Marana) after purification", "Steam distillation", "Simple trituration only"], correct: 1 },
    { question: "Which parameter is standard in herbal raw-material quality testing?", options: ["Loss on drying and ash value", "Refractive index only", "Melting point only", "Tensile strength"], correct: 0 },
    { question: "'Anupana' means:", options: ["A vehicle taken along with the medicine", "The dose of a medicine", "A contraindication", "A dosage form"], correct: 0 },
    { question: "Schedule T of the Drugs & Cosmetics Rules covers:", options: ["GMP for Ayurvedic, Siddha and Unani medicines", "Narcotic scheduling", "Clinical trial approvals", "Import licensing only"], correct: 0 },
  ],
  "Research & Clinical Documentation": [
    { question: "In a randomised controlled trial, blinding primarily reduces:", options: ["Selection bias", "Observer and reporting bias", "Sampling error", "Publication bias"], correct: 1 },
    { question: "CTRI, where Indian trials must be registered, stands for:", options: ["Clinical Trials Registry – India", "Central Therapeutic Research Institute", "Clinical Trial Review Index", "Council for Trial Regulation in India"], correct: 0 },
    { question: "Informed consent in a study must be:", options: ["Verbal only", "Documented, voluntary and revocable", "Signed by the investigator alone", "Obtained after the intervention"], correct: 1 },
    { question: "A p-value of 0.03 at a 5% significance level means:", options: ["The result is statistically significant", "The result is not significant", "The sample size was too small", "The effect size is large"], correct: 0 },
    { question: "Which body reviews the ethics of a clinical study in India?", options: ["Institutional Ethics Committee", "State Licensing Authority", "District Health Office", "University Senate"], correct: 0 },
  ],
};

export const SKILL_DOMAINS = Object.keys(QUESTION_BANK);

/** The Ayush half of the taxonomy, for views that want to highlight it. */
export const AYUSH_SKILL_DOMAINS = [
  "Ayurveda & Panchakarma",
  "Yoga & Naturopathy",
  "Unani, Siddha & Homeopathy",
  "Ayush Pharmacology & Formulation",
  "Research & Clinical Documentation",
];
