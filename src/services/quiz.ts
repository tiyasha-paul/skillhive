import { generateGeminiText } from './gemini';

export interface QuizQuestion {
  qid: string;
  question: string;
  options: {
    A: string;
    B: string;
    C: string;
    D: string;
  };
  correct: 'A' | 'B' | 'C' | 'D';
  explanation: string;
  topic: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

export interface QuizPackage {
  questions: QuizQuestion[];
}

const SUBJECT_LIST = {
  '1st Year': {
    'Semester 1': [
      'Mathematics – I',
      'Physics / Chemistry – I',
      'Basic Electrical Engineering',
      'Engineering Graphics / Engineering Drawing',
      'Programming for Problem Solving (C Programming)',
      'Environmental Science',
    ],
    'Semester 2': [
      'Mathematics – II',
      'Physics / Chemistry – II',
      'Basic Electronics Engineering',
      'Engineering Mechanics',
      'Data Structures',
      'Communication Skills',
    ],
  },
  '2nd Year': {
    'CSE': {
      'Semester 3': [
        'Data Structures',
        'Digital Logic & Computer Organization',
        'Discrete Mathematics',
        'Object Oriented Programming (OOPs)',
        'Operating Systems',
        'Computer Networks (Intro)',
      ],
      'Semester 4': [
        'Database Management Systems',
        'Design & Analysis of Algorithms',
        'Software Engineering',
        'Microprocessors & Microcontrollers',
        'Theory of Computation',
        'Probability & Statistics',
      ],
    },
    'ECE': {
      'Semester 3': [
        'Analog Electronic Circuits',
        'Digital Electronics',
        'Network Theory',
        'Signals & Systems',
        'Electronic Devices',
      ],
      'Semester 4': [
        'Electromagnetic Theory',
        'Microprocessors & Microcontrollers',
        'Communication Systems – I',
        'Linear Integrated Circuits',
        'Probability Theory & Random Processes',
      ],
    },
    'Civil Engineering': {
      'Semester 3': [
        'Strength of Materials – I',
        'Fluid Mechanics',
        'Surveying – I',
        'Engineering Geology',
        'Building Materials',
      ],
      'Semester 4': [
        'Strength of Materials – II',
        'Concrete Technology',
        'Structural Analysis – I',
        'Surveying – II',
        'Hydraulics & Hydraulic Machines',
      ],
    },
    'Mechanical Engineering': {
      'Semester 3': [
        'Engineering Thermodynamics',
        'Fluid Mechanics',
        'Manufacturing Processes – I',
        'Strength of Materials',
        'Kinematics of Machines',
      ],
      'Semester 4': [
        'Applied Thermodynamics',
        'Dynamics of Machines',
        'Heat & Mass Transfer',
        'Manufacturing Processes – II',
        'Machine Drawing',
      ],
    },
  },
  '3rd Year': {
    'CSE': {
      'Semester 5': [
        'Compiler Design',
        'Computer Networks (Advanced)',
        'Web Technologies',
        'Machine Learning (Basic)',
        'Distributed Systems',
        'Elective – 1',
      ],
      'Semester 6': [
        'Artificial Intelligence',
        'Computer Graphics',
        'Big Data / Data Mining',
        'Mobile Computing',
        'Elective – 2',
      ],
    },
    'ECE': {
      'Semester 5': [
        'Communication Systems – II',
        'Digital Signal Processing',
        'Control Systems',
        'VLSI Design (Intro)',
        'Antenna & Wave Propagation',
      ],
      'Semester 6': [
        'Embedded Systems',
        'Wireless Communication',
        'Optical Communication',
        'VLSI Design (Advanced)',
        'Elective',
      ],
    },
    'Civil Engineering': {
      'Semester 5': [
        'Structural Analysis – II',
        'Soil Mechanics',
        'Transportation Engineering – I',
        'Water Resources Engineering – I',
        'Concrete Structures',
      ],
      'Semester 6': [
        'Foundation Engineering',
        'Steel Structures',
        'Environmental Engineering – I',
        'Transportation Engineering – II',
        'Hydrology',
      ],
    },
    'Mechanical Engineering': {
      'Semester 5': [
        'Machine Design – I',
        'Internal Combustion Engines',
        'Theory of Machines',
        'Refrigeration & Air Conditioning',
        'Casting & Welding',
      ],
      'Semester 6': [
        'Machine Design – II',
        'Mechatronics',
        'Robotics',
        'CAD/CAM',
        'Industrial Engineering',
      ],
    },
  },
  '4th Year': {
    'CSE': {
      'Semester 7': [
        'Elective – AI/ML/Cloud/Cyber/IoT',
        'Distributed Computing / Blockchain',
        'Information Security',
        'Open Elective',
      ],
      'Semester 8': ['Internship / Industrial Training', 'Major Project – Phase 2', 'Seminar', '1–2 Electives'],
    },
    'ECE': {
      'Semester 7': ['Microwave Engineering', 'Wireless Networks', 'Elective – IoT/VLSI/Embedded/Robotics', 'Project Phase – I'],
      'Semester 8': ['Internship', 'Project Phase – II', 'Satellite Communication / Elective'],
    },
    'Civil Engineering': {
      'Semester 7': ['Environmental Engineering – II', 'Construction Management', 'Elective – Water, Structural, Geo etc.', 'Project Phase – I'],
      'Semester 8': ['Internship', 'Project Phase – II', 'Open Elective'],
    },
    'Mechanical Engineering': {
      'Semester 7': ['Power Plant Engineering', 'Finite Element Analysis', 'Elective – Automotive, Robotics, Thermal, etc.', 'Project Phase – I'],
      'Semester 8': ['Internship', 'Project Phase – II', 'Elective'],
    },
  },
};

export function getSubjectsForBranchSemester(branch: string, year: string, semester: string): string[] {
  if (year === '1st Year') {
    return SUBJECT_LIST[year][semester as keyof typeof SUBJECT_LIST['1st Year']] || [];
  }

  const yearData = SUBJECT_LIST[year as keyof typeof SUBJECT_LIST];
  if (!yearData || typeof yearData !== 'object') return [];

  const branchData = yearData[branch as keyof typeof yearData];
  if (!branchData || typeof branchData !== 'object') return [];

  return branchData[semester as keyof typeof branchData] || [];
}

export function getAllBranches(): string[] {
  return ['CSE', 'ECE', 'Civil Engineering', 'Mechanical Engineering'];
}

export function getAllYears(): string[] {
  return ['1st Year', '2nd Year', '3rd Year', '4th Year'];
}

export function getSemestersForYear(year: string): string[] {
  if (year === '1st Year') {
    return ['Semester 1', 'Semester 2'];
  }
  return ['Semester 3', 'Semester 4', 'Semester 5', 'Semester 6', 'Semester 7', 'Semester 8'].filter((sem) => {
    if (year === '2nd Year') return ['Semester 3', 'Semester 4'].includes(sem);
    if (year === '3rd Year') return ['Semester 5', 'Semester 6'].includes(sem);
    if (year === '4th Year') return ['Semester 7', 'Semester 8'].includes(sem);
    return false;
  });
}

export async function generateQuiz(branch: string, semester: string, subject: string): Promise<QuizPackage> {
  const prompt = `You are an expert academic content generator for B.Tech Engineering students under the Indian MAKAUT-style curriculum.

A student has selected the following:

BRANCH: ${branch}

SEMESTER: ${semester}

SUBJECT: ${subject}

Your job is to generate a complete quiz package for the "Take Quiz" section of an educational platform.

------------------------------------------------------------

STRICT RULES (FOLLOW EVERY POINT CAREFULLY)

------------------------------------------------------------

1. Generate EXACTLY **10 MCQs** based on the selected subject.

2. Questions MUST be relevant to the B.Tech engineering syllabus for the given:
   - Branch
   - Semester
   - Subject

3. EACH question MUST follow this structure:
   - "qid": a unique ID
   - "question": the question text (clear & conceptual)
   - "options": exactly 4 options labeled A, B, C, D
   - "correct": the correct option letter only (A/B/C/D)
   - "explanation": 1–3 lines explaining why the answer is correct
   - "topic": the EXACT sub-topic (important for progress graph)
   - "difficulty": one of ["easy","medium","hard"]

4. Difficulty distribution:
   - 4 easy
   - 4 medium
   - 2 hard

   - Questions must be ORIGINAL (do not copy online sources).  
   - They must test **conceptual understanding**, not just memory.
   - **Enclose ALL mathematical expressions, symbols, and equations in single dollar signs ($) for inline math or double dollar signs ($$) for block math.** Example: 'Here is $\\\\nabla \\\\times \\\\mathbf{E}$'.
   - **CRITICAL FOR JSON:** You MUST escape all backslashes in your LaTeX commands. For example, use '\\\\nabla' instead of '\\nabla', and '\\\\approx' instead of '\\approx'. If you do not escape them, the JSON will be invalid.

6. VERY IMPORTANT:  
   Output MUST be **valid JSON ONLY** — no commentary, no notes, no markdown, no code blocks.
   Start your response directly with { and end with }.
   Do NOT wrap the JSON in markdown code blocks.
   Do NOT add any text before or after the JSON.

7. The JSON must follow this exact schema:

{
  "questions": [
    {
      "qid": "unique-id-1",
      "question": "Your question here?",
      "options": {
        "A": "Option text",
        "B": "Option text",
        "C": "Option text",
        "D": "Option text"
      },
      "correct": "A",
      "explanation": "Short, clear explanation.",
      "topic": "Sub-topic name",
      "difficulty": "easy"
    },
    ...
  ]
}

8. All "topic" fields MUST match real syllabus subtopics. Examples:
   - Data Structures → "Linked Lists", "Trees", "Sorting", "Graph Traversal"
   - Digital Electronics → "Boolean Algebra", "Flip-Flops", "K-Maps"
   - Strength of Materials → "Stress & Strain", "Beams", "Shear Force"
   - Thermodynamics → "First Law", "Entropy", "Gas Processes"
   - Microprocessors → "8085 Architecture", "Addressing Modes"
   - Civil → "Surveying", "Hydraulics", "Concrete Technology"
   - ECE → "Filters", "Analog Circuits", "Signals & Systems"
   - Mechanical → "Kinematics", "Heat Transfer", "Machine Design"

9. Ensure MCQs are RANDOMLY GENERATED every time even for the same subject.

10. The correct answer MUST be 100% accurate because the platform will:
    - automatically grade the quiz
    - generate progress graphs using Chart.js
    - identify weak areas using the "topic" tagging

11. DO NOT generate numerical values requiring long calculations unless they are simple.

12. DO NOT include any extra text outside the final JSON.`;

  try {
    const response = await generateGeminiText(prompt);

    // Clean the response - remove markdown code blocks if present
    let cleanedResponse = response.trim();

    // Remove markdown code blocks
    if (cleanedResponse.includes('```json')) {
      const jsonMatch = cleanedResponse.match(/```json\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        cleanedResponse = jsonMatch[1].trim();
      } else {
        cleanedResponse = cleanedResponse.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      }
    } else if (cleanedResponse.includes('```')) {
      const codeMatch = cleanedResponse.match(/```\s*([\s\S]*?)\s*```/);
      if (codeMatch) {
        cleanedResponse = codeMatch[1].trim();
      } else {
        cleanedResponse = cleanedResponse.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }
    }

    // Try to extract JSON if there's extra text
    const jsonMatch = cleanedResponse.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      cleanedResponse = jsonMatch[0];
    }

    let quizData: QuizPackage;
    try {
      quizData = JSON.parse(cleanedResponse) as QuizPackage;
    } catch (parseError) {
      console.error('JSON Parse Error:', parseError);
      console.error('Response received:', response.substring(0, 500));
      throw new Error('Invalid JSON response from AI. Please try again.');
    }

    // Validate structure
    if (!quizData.questions || !Array.isArray(quizData.questions)) {
      throw new Error('Invalid quiz structure: Missing questions array');
    }

    if (quizData.questions.length !== 10) {
      console.warn(`Expected 10 questions, got ${quizData.questions.length}`);
      // Still proceed if we have questions, but log a warning
    }

    // Validate each question
    for (let i = 0; i < quizData.questions.length; i++) {
      const q = quizData.questions[i];
      if (!q.qid || !q.question || !q.options || !q.correct || !q.explanation || !q.topic || !q.difficulty) {
        throw new Error(`Invalid question structure at index ${i}: Missing required fields`);
      }
      if (!['A', 'B', 'C', 'D'].includes(q.correct)) {
        throw new Error(`Invalid correct answer at question ${i + 1}: Must be A, B, C, or D`);
      }
      if (!['easy', 'medium', 'hard'].includes(q.difficulty)) {
        throw new Error(`Invalid difficulty level at question ${i + 1}: Must be easy, medium, or hard`);
      }
      if (!q.options.A || !q.options.B || !q.options.C || !q.options.D) {
        throw new Error(`Invalid options at question ${i + 1}: All options A, B, C, D must be present`);
      }
    }

    return quizData;
  } catch (error) {
    console.error('Error generating quiz:', error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to generate quiz. Please try again.');
  }
}

