/**
 * Small, general-purpose question banks used to power online skill tests.
 * Each category is domain-agnostic (aptitude / fundamentals style) so a
 * single test is quick and fair to take regardless of a student's field.
 */

export const QUESTION_BANK = {
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
  "Programming Fundamentals": [
    { question: "What does 'API' stand for?", options: ["Application Programming Interface", "Advanced Program Integration", "Applied Programming Interface", "Automated Program Instruction"], correct: 0 },
    { question: "Which data structure follows First-In-First-Out (FIFO)?", options: ["Stack", "Queue", "Tree", "Graph"], correct: 1 },
    { question: "What is the time complexity of binary search on a sorted list of n items?", options: ["O(n)", "O(log n)", "O(n^2)", "O(1)"], correct: 1 },
    { question: "In a relational database, what does a single row in a table typically represent?", options: ["A function", "A single record", "A loop", "A variable"], correct: 1 },
    { question: "What does 'CSS' stand for in web development?", options: ["Computer Style Sheets", "Cascading Style Sheets", "Creative Style System", "Coded Style Syntax"], correct: 1 },
  ],
  "Business & Communication": [
    { question: "In a professional email, what does 'CC' typically mean?", options: ["Carbon Copy", "Central Copy", "Confirm Copy", "Copy Content"], correct: 0 },
    { question: "What is the first step in effective active listening?", options: ["Interrupting to clarify", "Giving full attention to the speaker", "Preparing your response while they talk", "Checking your phone"], correct: 1 },
    { question: "In a SWOT analysis, what does the 'O' stand for?", options: ["Objectives", "Opportunities", "Outcomes", "Operations"], correct: 1 },
    { question: "What is the primary purpose of a KPI (Key Performance Indicator)?", options: ["To decorate reports", "To measure progress toward a goal", "To replace employee reviews", "To set office rules"], correct: 1 },
    { question: "Which of these is good practice in a client meeting?", options: ["Arriving late to show you're busy", "Actively confirming next steps before ending", "Avoiding eye contact", "Speaking only about your own company"], correct: 1 },
  ],
};

export const SKILL_DOMAINS = Object.keys(QUESTION_BANK);
