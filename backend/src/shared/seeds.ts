export const companyPreparation = [
  {
    company: "TCS",
    interviewPattern: "Aptitude test, verbal, coding basics, HR round",
    frequentlyAskedQuestions: ["Tell me about yourself.", "What is normalization?", "Explain OOP principles."],
    skillsRequired: ["Aptitude", "DBMS", "OOP", "Communication"],
    preparationRoadmap: ["Revise aptitude", "Practice SQL basics", "Prepare HR answers"]
  },
  {
    company: "Infosys",
    interviewPattern: "Reasoning, coding, technical interview, HR",
    frequentlyAskedQuestions: ["Difference between process and thread?", "What is polymorphism?"],
    skillsRequired: ["DSA", "OOP", "SQL", "Problem solving"],
    preparationRoadmap: ["Solve array questions", "Revise OS concepts", "Practice behavioral stories"]
  },
  {
    company: "Amazon",
    interviewPattern: "OA, DSA rounds, system design, behavioral",
    frequentlyAskedQuestions: ["Why Amazon?", "Describe a leadership principle example."],
    skillsRequired: ["DSA", "System design", "Leadership principles"],
    preparationRoadmap: ["Practice mediums", "Revise STAR format", "Review design trade-offs"]
  }
];

export const codingProblems = [
  {
    id: "two-sum",
    title: "Two Sum",
    difficulty: "easy",
    languageTemplates: {
      python: "def solve(nums, target):\n    return []\n",
      java: "import java.util.*;\nclass Solution {\n    public int[] solve(int[] nums, int target) {\n        return new int[]{};\n    }\n}\n",
      cpp: "#include <bits/stdc++.h>\nusing namespace std;\nvector<int> solve(vector<int> nums, int target) {\n    return {};\n}\n",
      sql: "-- Write your SQL here\n"
    },
    prompt: "Return the indices of two numbers whose sum equals target.",
    visibleTests: [
      { input: { nums: [2, 7, 11, 15], target: 9 }, expected: [0, 1] }
    ],
    hiddenTests: [
      { input: { nums: [3, 2, 4], target: 6 }, expected: [1, 2] },
      { input: { nums: [3, 3], target: 6 }, expected: [0, 1] }
    ]
  },
  {
    id: "top-customers",
    title: "Top Customers",
    difficulty: "medium",
    languageTemplates: {
      python: "def solve(orders):\n    return []\n",
      java: "class Solution {\n    public Object solve(Object orders) {\n        return null;\n    }\n}\n",
      cpp: "#include <bits/stdc++.h>\nusing namespace std;\nvector<string> solve(vector<vector<string>> orders) {\n    return {};\n}\n",
      sql: "SELECT customer_id, SUM(amount) AS total_amount\nFROM orders\nGROUP BY customer_id\nORDER BY total_amount DESC;\n"
    },
    prompt: "Find customers ordered by total spend descending.",
    visibleTests: [
      { input: "orders table with customer_id and amount", expected: "Rows ordered by total_amount descending" }
    ],
    hiddenTests: []
  }
];

export const aptitudeQuestionBank = [
  {
    id: "apt-1",
    category: "Quantitative",
    difficulty: "easy",
    prompt: "If a train covers 120 km in 2 hours, what is its speed?",
    options: ["50 km/h", "60 km/h", "70 km/h", "80 km/h"],
    answer: "60 km/h",
    explanation: "Speed equals distance divided by time, so 120 / 2 = 60."
  },
  {
    id: "apt-2",
    category: "Logical Reasoning",
    difficulty: "easy",
    prompt: "Find the next term: 2, 4, 8, 16, ?",
    options: ["18", "24", "32", "36"],
    answer: "32",
    explanation: "Each term doubles."
  },
  {
    id: "apt-3",
    category: "Verbal",
    difficulty: "medium",
    prompt: "Choose the correctly spelled word.",
    options: ["Accomodate", "Acommodate", "Accommodate", "Acomodate"],
    answer: "Accommodate",
    explanation: "The correct spelling is accommodate."
  },
  {
    id: "apt-4",
    category: "Data Interpretation",
    difficulty: "medium",
    prompt: "Sales rose from 200 to 260. What is the percentage increase?",
    options: ["20%", "25%", "30%", "35%"],
    answer: "30%",
    explanation: "Increase is 60 over 200, which is 30%."
  }
];
