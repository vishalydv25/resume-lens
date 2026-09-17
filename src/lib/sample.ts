import type { Analysis } from "./schema.ts";
export const SAMPLE_RESUME = `Alex Morgan
Frontend Developer

SUMMARY
Frontend developer building responsive web applications with React and TypeScript.

SKILLS
JavaScript, TypeScript, React, HTML, CSS, Git, REST APIs, Jest

EXPERIENCE
Frontend Developer | Example Studio | 2023–2025
Built responsive React interfaces with TypeScript for an internal task management application.
Integrated REST APIs and implemented loading and error states.
Wrote unit tests with Jest for form validation utilities.
Collaborated with designers to implement reusable UI components.

PROJECTS
Taskboard — React, TypeScript, CSS
Built a task board with filtering, keyboard-accessible forms, and local storage.
Used Git branches and pull requests to review project changes.

EDUCATION
Bachelor of Computer Applications | Example College | 2023`;
export const SAMPLE_JOB = `Frontend Developer — Example Company
We are looking for a frontend developer to build clear, accessible product experiences.

Required:
- Build user interfaces with React and TypeScript.
- Integrate REST APIs and handle asynchronous states.
- Build responsive layouts for mobile and desktop.
- Write automated unit and integration tests.
- Collaborate using Git and pull requests.

Preferred:
- Experience with Next.js and server-side rendering.
- Experience implementing web accessibility best practices.
- Experience with CI/CD pipelines.

Please include examples of your project work.`;
export const SAMPLE_ANALYSIS: Analysis = {
  summary: "The sample resume shows relevant React, TypeScript, API integration, and responsive UI experience. Testing is evidenced at the unit level; Next.js and CI/CD experience are not stated. Accessibility has some project evidence but could be described more specifically.",
  requirements: [
    { requirement: "React & TypeScript", jobQuote: "Build user interfaces with React and TypeScript.", importance: "required", status: "supported", evidence: "Built responsive React interfaces with TypeScript for an internal task management application.", explanation: "A work-experience bullet directly describes both technologies." },
    { requirement: "REST API integration", jobQuote: "Integrate REST APIs and handle asynchronous states.", importance: "required", status: "supported", evidence: "Integrated REST APIs and implemented loading and error states.", explanation: "The resume describes integration and asynchronous UI states." },
    { requirement: "Responsive layouts", jobQuote: "Build responsive layouts for mobile and desktop.", importance: "required", status: "supported", evidence: "Built responsive React interfaces with TypeScript", explanation: "Responsive interface experience is stated; specific device testing would strengthen it." },
    { requirement: "Automated testing", jobQuote: "Write automated unit and integration tests.", importance: "required", status: "partial", evidence: "Wrote unit tests with Jest for form validation utilities.", explanation: "Unit testing is shown, but integration testing is not stated." },
    { requirement: "Git collaboration", jobQuote: "Collaborate using Git and pull requests.", importance: "required", status: "supported", evidence: "Used Git branches and pull requests to review project changes.", explanation: "The project includes direct evidence of a review workflow." },
    { requirement: "Next.js & server rendering", jobQuote: "Experience with Next.js and server-side rendering.", importance: "preferred", status: "not_found", evidence: "", explanation: "Neither Next.js nor server-side rendering is mentioned. This does not prove the candidate lacks these skills." },
    { requirement: "Web accessibility", jobQuote: "Experience implementing web accessibility best practices.", importance: "preferred", status: "partial", evidence: "Built a task board with filtering, keyboard-accessible forms, and local storage.", explanation: "Keyboard-accessible forms are relevant; broader accessibility practices are not described." },
    { requirement: "CI/CD pipelines", jobQuote: "Experience with CI/CD pipelines.", importance: "preferred", status: "not_found", evidence: "", explanation: "No pipeline tooling or deployment automation is stated." }
  ],
  strengths: ["Concrete React and TypeScript implementation experience.", "API integration includes loading and error handling.", "Project bullets include both testing and collaboration practices."],
  improvements: [
    { title: "Make testing scope clear", advice: "Keep the Jest unit-testing example. If you have integration-testing experience, add a specific, truthful example; otherwise treat it as a learning opportunity.", priority: "high" },
    { title: "Explain the outcome of your work", advice: "Describe what the task management application enabled users to do. Add measurements only if you can verify them; do not invent percentages.", priority: "medium" },
    { title: "Add accessible UI specifics", advice: "Explain the keyboard interaction you implemented in Taskboard. Include additional accessibility techniques only if you actually used them.", priority: "medium" }
  ],
  rewrites: [
    { original: "Integrated REST APIs and implemented loading and error states.", suggested: "Integrated REST APIs with loading and error states to make request status clear in the interface.", reason: "Connects the implementation to its interface purpose without adding metrics or technologies." },
    { original: "Wrote unit tests with Jest for form validation utilities.", suggested: "Tested form validation utilities with Jest unit tests.", reason: "Uses concise, direct wording while preserving the original scope." }
  ]
};
