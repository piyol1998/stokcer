import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI('AIzaSyCCH4HEbO6Tr7KThKnfs1sHRhishM3cVNQ');

async function run() {
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
  try {
    const result = await model.generateContent("hello");
    console.log(result.response.text());
  } catch (e) {
    console.error(e);
  }
}

run();
