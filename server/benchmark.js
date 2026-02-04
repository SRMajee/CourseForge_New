const autocannon = require("autocannon");

// CONFIGURATION
const TARGET_URL = `http://localhost:8080/api/v1/courses/outline`; // Update with your actual route
const AUTH_TOKEN = "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6ImI0S1RRYnRjTlM3RGJqbGY3NVQwNiJ9.eyJpc3MiOiJodHRwczovL2Rldi1ubTh1djEzejAyaXh6dmZ0LnVzLmF1dGgwLmNvbS8iLCJzdWIiOiJhdXRoMHw2OTgyMzI3MzUwMTQ5NzliZGJkZjU4Y2UiLCJhdWQiOlsiaHR0cHM6Ly9jb3Vyc2Vmb3JnZS1hcGkiLCJodHRwczovL2Rldi1ubTh1djEzejAyaXh6dmZ0LnVzLmF1dGgwLmNvbS91c2VyaW5mbyJdLCJpYXQiOjE3NzAyMTA3MzksImV4cCI6MTc3MDI5NzEzOSwic2NvcGUiOiJvcGVuaWQgcHJvZmlsZSBlbWFpbCBvZmZsaW5lX2FjY2VzcyIsImF6cCI6IloyMVlNTTZ2NUF1dHVZampXYjcwRXIzRjdkdlpPNGc0IiwicGVybWlzc2lvbnMiOltdfQ.KUmMX03En88oXkMNsTVsuoACwte_cstfkR4yY8Ru4yGzpLheoCk7SmiO9yBKuwfT5fON7CwHCCsE4fN5Wc3eckG6BzdUsRrK24rlqjofOwFxj96eJDbeqJNn6A4hLr5VK7MR3eRbPcrmuWDZNOq520YUX8S3qBvovH7xoe6kLGSAHMjHRAXvlf3jwrKO4c1xSH2113IIZhRnZV5__-eIZH3VoGIlFRHeidxIfZQwwD2KvclBOctDp5PzSN7tOmPpbAd6EfJDo75eUpbhC6gEmSLpObTmu1_EX7XChC8xd1pRhu0NKRtnYOnrPN2Sv8myhSy3wInhfs01EyBUbMyR9g";

async function runBenchmark() {
  console.log('🚀 Starting "CourseForge" Load Test...');
  console.log("Targeting: Async Job Submission Endpoint");

  const instance = autocannon({
    url: TARGET_URL,
    connections: 100, // Simulating 100 concurrent users hitting "Generate" at once
    duration: 10, // Run for 10 seconds
    method: "POST",
    headers: {
      "content-type": "application/json",
      Authorization: `Bearer ${AUTH_TOKEN}`,
    },
    // The body should match what your API expects to start a generation job
    body: JSON.stringify({
      topic: "Advanced System Design",
      skipClarification: true,
      mode: "standard",
    }),
  });

  // Real-time progress bar
  autocannon.track(instance, { renderProgressBar: true });

  const result = await instance;

  // PRINT RESULTS FOR RESUME
  console.log("\n--- 📊 BENCHMARK RESULTS ---");
  console.log(`Total Requests Sent: ${result.requests.sent}`);
  console.log(`Throughput: ${result.requests.average} req/sec`);
  console.log(`Average Latency: ${result.latency.average} ms`);
  console.log(`99th Percentile Latency: ${result.latency.p99} ms`);
  console.log("----------------------------");

  generateResumeBullet(result);
}

function generateResumeBullet(result) {
  const rps = Math.floor(result.requests.average);
  const p99 = Math.floor(result.latency.p99);

  console.log("\n📝 COPY THIS TO YOUR RESUME:");
  console.log(
    `> "Validated system stability under load, handling ${rps} concurrent requests/sec with ${p99}ms latency by offloading AI tasks to a dedicated worker fleet."`,
  );
}

runBenchmark();
