---
title: "Taming CORS in a Microservices Monorepo: From Async Validation to a Unified Config"
description: "CORS errors can be frustrating, especially in a microservices monorepo setup. This blog dives into what CORS really is, why it matters, and how I solved the CORS challenge using a shared JSON config file — establishing a single source of truth for all services."
date: 2025-05-11
tags: []
---

<p>Cross-Origin Resource Sharing (CORS) is a security feature implemented by web browsers. It restricts web applications running on one origin (domain) from interacting with resources from another unless explicitly allowed.</p>

<p>Let’s say your frontend is hosted at <code>https://app.example.com</code> and your API is at <code>https://api.example.com</code>. By default, browsers will block requests from the frontend to the backend unless the backend server allows it via CORS headers.</p>

<h2>Why CORS is Necessary</h2>
<p>CORS exists to protect users from malicious websites that attempt to read sensitive data from another origin (like your banking session). Without CORS, any site could fetch data from any API the user is authenticated with — a nightmare for security.</p>

<p>In development, however, it often feels like a headache: “Why is my API call failing even though the backend is up?” More often than not, it’s a CORS misconfiguration.</p>

<h2>How CORS Works (Including Preflight)</h2>
<p>There are two types of CORS requests:</p>
<ul>
<li><strong>Simple Requests:</strong> Like a <code>GET</code> with no custom headers.</li>
<li><strong>Preflighted Requests:</strong> Any request that modifies data (e.g., <code>POST</code>, <code>PUT</code>) or includes custom headers triggers a preflight check — an initial <code>OPTIONS</code> request sent by the browser to verify if the real request is safe to send.</li>
</ul>

<p>If your server fails to respond to this <code>OPTIONS</code> request correctly, the real request is never made.</p>

<h2>My CORS Problem: Microservices in a Monorepo</h2>
<p>I’m working on a platform called PolyX — built using a microservices architecture, all managed in a <strong>Yarn monorepo</strong>. Each service runs independently but shares the same workspace — and that’s where the challenge came in.</p>

<p>I initially allowed each service to define its own list of allowed CORS origins. But in a monorepo setup, this quickly became unmanageable. A new frontend domain? I had to update every service manually. Worse: discrepancies started appearing between environments.</p>

<h2>Early Attempt: Asynchronous Origin Validation</h2>
<p>My first idea was to validate origins asynchronously — fetching allowed origins from a central store (like Redis or MongoDB) during every request. It was technically flexible, but practically inefficient.</p>

<p>Why? Because:</p>
<ul>
<li>Every request triggered a DB read</li>
<li>This added latency to every API call</li>
<li>Even OPTIONS (preflight) requests had to go through this check</li>
</ul>

<p>It was elegant in theory, but a performance and stability bottleneck in practice.</p>

<h2>The Real Solution: A Shared JSON File</h2>
<p>So, I went back to basics. I created a single JSON file inside the monorepo:</p>


```text
/poly-auth/poly-common/config/allowed-origins.json
```


<p>Every microservice now loads its allowed origins from this file at startup. And this is where the magic of a monorepo shines — since everything lives in one place, all services can import and reference the same file easily.</p>

<h3>Sample JSON File</h3>


```text
{
    "allowedOrigins": [
      "https://admin.example.com",
      "https://dashboard.example.com",
      "https://app.example.com"
    ]
  }
```


<h2>Why a Single Source of Truth Matters</h2>
<p>Beyond CORS, this experience taught me the value of <strong>single source of truth (SSOT)</strong> in monorepo architecture:</p>

<ul>
<li>✅ Reduces config drift across services</li>
<li>✅ Makes onboarding easier</li>
<li>✅ Enables automation and CI checks on shared settings</li>
<li>✅ Avoids bugs caused by inconsistent behavior</li>
</ul>

<p>This pattern now powers not just CORS — but also shared error codes, status enums, role definitions, and even environment flags.</p>

<h2>Implementing It in Node.js</h2>
<p>Here’s a basic snippet of how a service loads and uses the JSON config:</p>


```text
import fs from 'fs';
  import path from 'path';
  
  const ORIGIN_FILE_PATH = path.join(__dirname, '../config/allowed-origins.json');
  const rawOrigins = fs.readFileSync(ORIGIN_FILE_PATH, 'utf-8');
  const { allowedOrigins } = JSON.parse(rawOrigins);
  
  app.use(cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true
  }));
```


<p>This way, no matter which service handles a request, it follows the same rules — with zero runtime calls to databases or external services.</p>

<h2>Lessons Learned</h2>
<p>Here’s what I learned through this journey:</p>
<ul>
<li><strong>Don’t over-engineer early.</strong> CORS doesn’t need to be dynamic for most setups.</li>
<li><strong>Monorepos simplify shared config.</strong> Lean into that instead of duplicating.</li>
<li><strong>Performance matters in security middleware.</strong> Especially for preflight requests.</li>
</ul>

<h2>Final Thoughts</h2>
<p>CORS errors can feel like black magic at times — but understanding how they work and structuring your architecture with clarity makes all the difference. For me, it wasn’t about a fancy fix. It was about designing with simplicity, maintainability, and shared ownership in mind.</p>

<p>And sometimes, the best solution is the one that lives in a good old JSON file.</p>
