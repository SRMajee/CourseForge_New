const OpenAI = require("openai");

// Initialize the client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY, // Or replace with "sk-..." directly
});

async function main() {
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: "You are a helpful assistant." },
      { role: "user", content: "Write a haiku about JavaScript." },
    ],
  });

  console.log(completion.choices[0].message.content);
}

main();