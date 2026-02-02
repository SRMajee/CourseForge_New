This is a comprehensive transformation plan. We are effectively rebuilding the core user experience to be "AI-First" rather than "Admin-First."

Here is the **Phased Implementation Plan** to transform CourseForge into a high-end AI Studio.

---

### **Phase 1: Backend Core & Data Schema (The Foundation)**

We cannot build the UI until the data supports "Pro Mode," "Free Trials," and "Course Images."

**1.1 Database Schema Updates (`User` Model)**

* Add `hasUsedProTrial` (Boolean, default `false`) to track the one-time freebie.
* Add `preferences` object to store "Pro Mode" default state if users want it to stick.

**1.2 Database Schema Updates (`Course` Model)**

* Add `thumbnailUrl` (String) to store the Unsplash image (so we don't hit the API on every page load).
* Add `generationMode` (Enum: `'standard'`, `'pro'`) to track how it was built.
* Add `feedback` (Enum: `'like'`, `'dislike'`, `null`) for the Like/Dislike feature.

**1.3 Unsplash Service Integration**

* Create `src/services/imageService.ts`.
* Implement `searchImage(query)` that hits the Unsplash API.
* **Optimization:** If the API fails or rate limits, fallback to a set of high-quality local gradients/assets so the UI never breaks.

**1.4 "Pro Logic" & Cost Middleware**

* Update `courseService.generateCourse`:
* Accept `isProMode` flag.
* **Logic:**
* If `isProMode` is true:
* Check if User is Pro.
* If NOT Pro: Check `!hasUsedProTrial`. If used, throw error. If not used, mark `hasUsedProTrial = true` and proceed (cost = 0 or discounted).
* If Pro: Cost = 100.


* If `isProMode` is false: Cost = 50.





---

### **Phase 2: The "AI Studio" Layout (The Dashboard Overhaul)**

This changes the first thing the user sees. No more grids.

**2.1 The "Chat-Style" Layout**

* Create a new persistent layout (`StudioLayout`) different from the marketing pages.
* **Sidebar (Left):**
* "New Chat" button at the top.
* **Infinite Scroll History:** A list of past courses grouped by time (Today, Yesterday, Last Week).
* User Profile & Settings at the bottom.


* **Main Stage (Center):**
* If no course selected: The **"Hero Input"** (Center screen, big text input).
* If course selected: The Course Viewer.



**2.2 The "Hero" Input Component**

* A beautiful, centered input bar (like Perplexity/ChatGPT).
* **The Pro Toggle:** A switch inside or below the input bar.
* **Visuals:** When toggled ON, the input bar glows Purple/Gold.
* **Badge:** "Pro Mode: Deep Research & Human-in-the-Loop".
* **Logic:** Updates the displayed cost dynamically (50 -> 100).



**2.3 The "Free Trial" UX**

* If a Free User toggles "Pro Mode":
* Show a shimmering badge: **"Free Trial Active (1/1)"**.
* If they have *already* used it: Show a locked icon and "Upgrade to use" tooltip.



---

### **Phase 3: The "Netflix" Library & Visuals**

Replacing the boring lists with high-engagement visuals.

**3.1 Image Generation Pipeline**

* When a user creates a course (e.g., "Ancient Rome"), the backend triggers the Unsplash Service.
* It finds a relevant high-res image and saves it to the `Course` document.

**3.2 The "Netflix Card" Component**

* **Aspect Ratio:** 16:9 (Cinematic) or 3:4 (Poster).
* **Design:**
* Full-bleed background image.
* Gradient overlay at the bottom for text readability.
* Title in bold, modern typography.
* "Pro" badge in the corner if generated with Pro Mode.


* **Hover Effect:** Scale up slightly (1.05x), show "Play/Resume" button.

**3.3 Infinite Scroll Grid**

* On the "My Courses" or "Explore" page, implement `react-intersection-observer`.
* As the user scrolls, fetch the next 10 "Netflix Cards".

---

### **Phase 4: Deep Interaction (Regeneration & HITL)**

Making the AI feel "alive" and responsive.

**4.1 Human-in-the-Loop (HITL) 2.0**

* **Standard Mode:** Direct generation.
* **Pro Mode:**
* Show a **"Thinking..."** terminal animation (like you see in VS Code terminals or sci-fi movies).
* Pause generation.
* Present the **Clarification Chat** (from your existing code) but styled as a natural conversation, not a form.



**4.2 Contextual Regeneration**

* Add a "Regenerate" button to the Course Outline.
* **Modal:** "How should we improve this?"
* Options: "Make it harder", "Focus on practical examples", "Fix bugs".
* **Pro vs. Standard:**
* Standard: Uses the base model.
* Pro: Uses GPT-4o (smarter restructuring).





**4.3 Lesson Regeneration & Audio Locks**

* **Lesson:** Add "Refine with AI" button in the lesson view.
* Dropdown: "Standard (Fast)" vs "Pro (Deep Dive)".
* If Free user selects Pro -> **Trigger TopUpModal**.


* **Audio:**
* Language Dropdown:
* English (Unlocked for all).
* Spanish, Hindi, French (Locked with "Pro" icon for free users).





---

### **Phase 5: Polish & "Temptation" (UI/UX)**

The finishing touches that make it feel premium.

**5.1 Empty States & Loading**

* Instead of a spinning circle, use **Skeleton Loaders** that look like the Netflix cards.
* Add "Did you know?" tips while generating (e.g., "Pro users can generate courses in 50+ languages.").

**5.2 Feedback Loop**

* Add "Thumbs Up/Down" icons to every generated response.
* On "Thumbs Down", ask "What went wrong?" (Data goldmine for improvements).

**5.3 Top-Up Interception**

* Create a global `useCreditCheck` hook.
* Wrap every "Generate" button. If `credits < cost`, intercept the click and open the `TopUpModal` immediately, passing the current page as the `returnUrl`.

### **Which phase do you want to start with?**

I recommend **Phase 1 (Backend Core)** so we have the data structure ready for the visuals. Shall I provide the code for the Schema updates and Unsplash Service first?