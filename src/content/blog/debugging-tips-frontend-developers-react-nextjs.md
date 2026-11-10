---
title: "Debugging Tips for Frontend Developers (React + Next.js)"
description: "Effective debugging is one of the most valuable skills for frontend developers. Here's a practical guide to debugging with logs, using the debugger keyword, troubleshooting APIs, and improving performance — with a special focus on React and Next.js."
date: 2025-04-26
tags: []
---

<p>Debugging isn't just fixing what's broken — it's about understanding the full lifecycle of your application. The earlier you learn this mindset, the faster you’ll grow as a developer.</p>

<h2>Debugging with Logs</h2>
<p><strong>Logging</strong> is your first and simplest line of defense. Use <code>console.log</code>, <code>console.error</code>, and <code>console.warn</code> effectively to track what your code is doing at every step.</p>

<h3>Example: Logging API Request/Response</h3>


```text
async function fetchUserData() {
    console.log("Starting API call...");
    try {
      const response = await fetch('/api/user');
      const data = await response.json();
      console.log("API call success:", data);
      return data;
    } catch (error) {
      console.error("API call failed:", error);
    }
  }
```


<p>Notice how we log <strong>before</strong> starting the call, and separately log the <strong>successful</strong> and <strong>error</strong> paths.</p>

<h2>Using the <code>debugger</code> Keyword</h2>
<p>When logging isn’t enough, the <code>debugger</code> keyword lets you pause code execution and inspect live values and the call stack in DevTools.</p>

<h3>Example: Freezing the Code with Debugger</h3>


```text
function calculateTotal(price, tax) {
    const total = price + tax;
    debugger; // Execution will pause here
    return total;
  }
  
  const finalAmount = calculateTotal(100, 20);
  console.log("Final Amount:", finalAmount);
```


<p>When you reach <code>debugger</code>, the browser will pause execution. You can inspect variables like <code>price</code>, <code>tax</code>, and <code>total</code> right inside DevTools.</p>

<h2>Debugging APIs and Network Issues</h2>
<p>React and Next.js apps are API-heavy. Knowing how to debug API calls is crucial.</p>
<ul>
<li>Always log the <strong>request payload</strong> and <strong>API response</strong>.</li>
<li>Check the <strong>Network</strong> tab in DevTools to inspect headers, status codes, and timings.</li>
<li>Look for common mistakes: incorrect URLs, missing auth headers, wrong HTTP methods, or parsing errors.</li>
</ul>

<h3>Example: API Call Debugging</h3>


```text
async function loginUser(credentials) {
    console.log("Sending login request with credentials:", credentials);
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials),
      });
      const result = await res.json();
      console.log("Login response:", result);
    } catch (error) {
      console.error("Login API failed:", error);
    }
  }
```


<h2>Checking API Response Time</h2>
<p>Use the DevTools Network tab to analyze:</p>
<ul>
<li><strong>DNS Lookup</strong></li>
<li><strong>Connection time</strong></li>
<li><strong>Server processing time</strong></li>
<li><strong>Download time</strong></li>
</ul>
<p>Identify if slowness is happening on your end (frontend) or backend (server).</p>

<h2>Special Tips for React and Next.js</h2>
<h3>In React:</h3>
<ul>
<li>Use <code>React Developer Tools</code> extension to inspect props and state visually.</li>
<li>Log inside <code>useEffect</code> to trace when effects re-run.</li>
</ul>

<h3>In Next.js:</h3>
<ul>
<li>Use <code>console.log</code> inside <code>getServerSideProps</code> and <code>API Routes</code>.</li>
<li>Remember that server-side logs appear in the Node.js terminal (not browser).</li>
</ul>

<h2>Real-World Debugging Scenario</h2>
<h3>Bug: Button Click Not Working</h3>


```text
function MyButton() {
    const handleClick = () => {
      console.log("Button clicked!");
      // Suppose something is supposed to happen here
    };
  
    return (
      <button onClick={handleClick}>Click Me</button>
    );
  }
```


<p>If clicking doesn't log anything:</p>
<ul>
<li>Check if the event handler is wired correctly (<code>onClick</code> vs <code>onclick</code> typo?)</li>
<li>Use <code>debugger</code> inside <code>handleClick</code> to pause execution.</li>
<li>Check if any parent container is swallowing the event (like a <code>preventDefault</code> somewhere).</li>
</ul>

<h2>Building a Debugging Mindset</h2>
<ul>
<li><strong>Don't guess.</strong> Observe and investigate.</li>
<li><strong>Isolate issues.</strong> Comment out blocks to find culprits faster.</li>
<li><strong>Master DevTools.</strong> Especially the Console, Network, and Sources tabs.</li>
<li><strong>Read errors carefully.</strong> They usually tell you exactly what's wrong if you pay attention.</li>
</ul>

<h2>Tools to Amplify Your Debugging</h2>
<ul>
<li><strong>React DevTools</strong> — Visualize component hierarchy, props, and state.</li>
<li><strong>Redux DevTools</strong> — If using Redux, track actions and state changes easily.</li>
<li><strong>VSCode Debugger</strong> — Set breakpoints directly inside your code editor for seamless inspection.</li>
</ul>

<h2>Final Thoughts</h2>
<p>Great developers aren't the ones who never face bugs. They're the ones who <strong>debug efficiently</strong> and <strong>learn faster</strong> from every problem.</p>
<p>Master these debugging fundamentals now, and you'll separate yourself from the average developers much faster!</p>
