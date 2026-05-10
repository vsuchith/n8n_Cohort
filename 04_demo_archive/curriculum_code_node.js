// ATG 2026 curriculum lookup — paste this into the Code node of the
// `lookup_curriculum` sub-workflow.
//
// Input from the agent: { query: "<search term>" } (or empty for top items)
// Output: array of matching curriculum items (max 10).

const curriculum = [
  { sl_no: 1,  level: "Introduction",       title: "Introduction to Generative AI",                                                          duration: "1 Hour",  url: "https://www.cloudskillsboost.google/paths/118" },
  { sl_no: 2,  level: "Introduction",       title: "Introduction to Large Language Models",                                                  duration: "1 Hour",  url: "https://www.cloudskillsboost.google/paths/118" },
  { sl_no: 3,  level: "Introduction",       title: "Introduction to Responsible AI",                                                         duration: "1 Hour",  url: "https://www.cloudskillsboost.google/paths/118" },
  { sl_no: 4,  level: "Nice to have",       title: "Prompt Design in Vertex AI",                                                             duration: "3 Hours", url: "https://www.cloudskillsboost.google/paths/118" },
  { sl_no: 5,  level: "Introduction",       title: "Responsible AI: Applying AI Principles with Google Cloud",                               duration: "3 Hours", url: "https://www.cloudskillsboost.google/paths/118" },
  { sl_no: 6,  level: "Prompt Engineering", title: "Introduction to Prompt Engineering Fundamentals",                                        duration: "3 Hours", url: "https://www.simplilearn.com/prompt-engineering-free-course-skillup" },
  { sl_no: 7,  level: "Prompt Engineering", title: "Prompt Engineering for Effective Interaction with ChatGPT",                              duration: "12 Hours", url: "https://machinelearningmastery.com/prompt-engineering-for-effective-interaction-with-chatgpt/" },
  { sl_no: 8,  level: "Advance",            title: "Introduction to Image Generation",                                                       duration: "1 Hour",  url: "https://www.cloudskillsboost.google/paths/183" },
  { sl_no: 9,  level: "Advance",            title: "Attention Mechanism",                                                                    duration: "1 Hour",  url: "https://www.cloudskillsboost.google/paths/183" },
  { sl_no: 10, level: "Advance",            title: "Encoder-Decoder Architecture",                                                           duration: "1 Hour",  url: "https://www.cloudskillsboost.google/paths/183" },
  { sl_no: 11, level: "Nice to have",       title: "Transformer Models and BERT Model",                                                      duration: "1 Hour",  url: "https://www.cloudskillsboost.google/paths/183" },
  { sl_no: 12, level: "Advance",            title: "Create Image Captioning Models",                                                         duration: "1 Hour",  url: "https://www.cloudskillsboost.google/paths/183" },
  { sl_no: 13, level: "Nice to have",       title: "Introduction to Vertex AI Studio",                                                       duration: "2 Hours", url: "https://www.cloudskillsboost.google/paths/183" },
  { sl_no: 14, level: "Advance",            title: "Vector Search and Embeddings",                                                           duration: "5 Hours", url: "https://www.cloudskillsboost.google/paths/183" },
  { sl_no: 15, level: "Advance",            title: "Inspect Rich Documents with Gemini Multimodality and Multimodal RAG",                    duration: "2 Hours", url: "https://www.cloudskillsboost.google/paths/183" },
  { sl_no: 16, level: "Advance",            title: "Responsible AI for Developers: Fairness & Bias",                                         duration: "4 Hours", url: "https://www.cloudskillsboost.google/paths/183" },
  { sl_no: 17, level: "Advance",            title: "Responsible AI for Developers: Interpretability & Transparency",                         duration: "3 Hours", url: "https://www.cloudskillsboost.google/paths/183" },
  { sl_no: 18, level: "Advance",            title: "Responsible AI for Developers: Privacy & Safety",                                        duration: "5 Hours", url: "https://www.cloudskillsboost.google/paths/183" },
  { sl_no: 19, level: "Advance",            title: "Machine Learning Operations (MLOps) for Generative AI",                                  duration: "1 Hour",  url: "https://www.cloudskillsboost.google/paths/183" },
  { sl_no: 20, level: "Introduction",       title: "GitHub CoPilot training video",                                                          duration: "3 Hours", url: "https://drive.google.com/file/d/12vWnFmbM3jRuiCTXkL_Sy93BUOEalChV/view" },
  { sl_no: 21, level: "Tutorials",          title: "VS Code Lesson 1: GitHub Copilot 101",                                                   duration: "2 Hours", url: "https://github.com/features/copilot/tutorials" },
  { sl_no: 22, level: "Tutorials",          title: "VS Code Lesson 2: Mastering the basics",                                                 duration: "2 Hours", url: "https://github.com/features/copilot/tutorials" },
  { sl_no: 23, level: "Tutorials",          title: "VS Code Lesson 3: Practices for success",                                                duration: "2 Hours", url: "https://github.com/features/copilot/tutorials" },
  { sl_no: 24, level: "Assignments",        title: "Project 1: Simple chatbot with Gemini API + Langchain backend",                          duration: "2 days",  url: "Project - 1" },
  { sl_no: 25, level: "Assignments",        title: "Project 2: Add Postgres DB layer + Amzur employee login",                                duration: "2 days",  url: "Project - 2" },
  { sl_no: 26, level: "Assignments",        title: "Project 3: Google login + chat thread CRUD with auto-naming",                            duration: "2 days",  url: "Project - 3" },
  { sl_no: 27, level: "Assignments",        title: "Project 4: 5-message conversation memory",                                               duration: "2 days",  url: "Project - 4" },
  { sl_no: 28, level: "Assignments",        title: "Project 5: Multimodal input (images/videos/tables/formulas/code)",                       duration: "2 days",  url: "Project - 5" },
  { sl_no: 29, level: "Assignments",        title: "Project 6: Image generation with Gemini 2.0",                                            duration: "2 days",  url: "Project - 6" },
  { sl_no: 30, level: "Assignments",        title: "Project 7: PDF upload + RAG with ChromaDB + OpenAI Embeddings Large",                    duration: "2 days",  url: "Project - 7" },
  { sl_no: 31, level: "Assignments",        title: "Project 8: Connect to a database, query in natural language (NL-to-SQL)",                duration: "2 days",  url: "Project - 8" },
  { sl_no: 32, level: "Assignments",        title: "Project 9: Extend NL queries to Excel/GSheet files",                                     duration: "2 days",  url: "Project - 9" },
  { sl_no: 33, level: "Assignments",        title: "Project 10: Image rule-checking via data extraction",                                    duration: "2 days",  url: "Project - 10" },
  { sl_no: 34, level: "Assignments",        title: "Project 11: Basic LLM agent with Langchain",                                             duration: "2 days",  url: "Project - 11" },
  { sl_no: 35, level: "Assignments",        title: "Project 12: Tic-tac-toe agent with Langchain",                                           duration: "2 days",  url: "Project - 12" },
  { sl_no: 36, level: "Assignments",        title: "Project 13: Agent with MCP example",                                                     duration: "2 days",  url: "Project - 13" },
  { sl_no: 37, level: "Assignments",        title: "Project 14: Create agents with N8N",                                                     duration: "2 days",  url: "Project - 14" },
  { sl_no: 41, level: "Final Project",      title: "Capstone — details revealed after all modules completed",                                duration: "15 days", url: "The final project (Capstone)" },
];

// Get the search query from the agent's tool call.
// $input.first().json may contain { query: "..." } from the Call n8n Workflow Tool node.
const rawQuery = (($input.first()?.json?.query) || '').toString().toLowerCase().trim();

// No query → return the first 10 items as a default browse.
if (!rawQuery) {
  return curriculum.slice(0, 10).map(item => ({ json: item }));
}

// Filter: case-insensitive substring match across every visible field.
const matches = curriculum.filter(item => {
  const haystack = [
    item.title,
    item.level,
    item.duration,
    String(item.sl_no),
    `project ${item.sl_no}`,
    `project-${item.sl_no}`,
    item.url,
  ].join(' ').toLowerCase();
  return haystack.includes(rawQuery);
});

if (matches.length === 0) {
  return [{
    json: {
      query: rawQuery,
      result: `No assignments found matching "${rawQuery}".`,
      total_curriculum_items: curriculum.length,
      hint: "Try terms like: prompt, MCP, langchain, Project 13, advanced, RAG, image, vector",
    }
  }];
}

return matches.slice(0, 10).map(item => ({ json: item }));
