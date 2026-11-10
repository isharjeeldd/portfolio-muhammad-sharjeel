export const site = {
  name: 'Muhammad Sharjeel',
  shortName: 'Muhammad Sharjeel',
  role: 'Senior Software Engineer',
  company: 'wAI Industries',
  location: 'Islamabad, Pakistan',
  url: 'https://www.sharjeelafzaal.com',
  email: 'sharjeelafzaal123@gmail.com',
  github: 'https://github.com/isharjeeldd',
  linkedin: 'https://www.linkedin.com/in/muhammad-sharjeel-254a48108/',
  upwork: 'https://www.upwork.com/freelancers/~010ece6ddbb7345ea6',
  title: 'Muhammad Sharjeel, Senior Software Engineer',
  description:
    'Senior Software Engineer in Islamabad. I build the identity, tenancy and Kubernetes layer under multi-tenant AI products: the PolyX platform and SDK, Alara Code, Alara Space and Alara Plan.',
  keywords: [
    'Muhammad Sharjeel',
    'Senior Software Engineer',
    'platform engineer',
    'multi-tenant SaaS',
    'identity platform',
    'Kubernetes',
    'TypeScript',
    'MCP servers',
    'AI platform engineering',
    'Islamabad',
  ],
};

export type Project = {
  name: string;
  slug: string;
  summary: string;
  role: string;
  period: string;
  points: string[];
  stack: string;
  link?: { label: string; href: string };
};

export const projects: Project[] = [
  {
    name: 'PolyX',
    slug: 'polyx',
    summary: 'Identity, tenancy and access platform shared by every product in the company.',
    role: 'Core platform engineer',
    period: 'Since 2023',
    points: [
      'Designed and built the unified identity provider: one sign-in, single sign-on and cross-app sessions, with organisations, workspaces and per-tenant module and permission access control.',
      'Five Node.js services (identity and access, notifications, API tooling, logging, sandboxed API execution) on one shared trust model.',
      'Shadow identities, so platform staff can support a customer tenant without taking a seat or showing up in that customer\'s directory.',
      'Found and closed a cross-tenant privilege escalation and an account-takeover path in password reset, then led the hardening that followed a client penetration test.',
      'Traced platform-wide logouts to three causes: a token-expiry default, a race in refresh-token rotation, and Redis evicting session keys under an untrimmed log stream. Shipped all three fixes.',
    ],
    stack: 'TypeScript, Node.js, Express, MongoDB, Redis, Elasticsearch, Kubernetes',
  },
  {
    name: 'PolyX SDK',
    slug: 'polyx-sdk',
    summary: 'TypeScript auth SDK on npm that puts the platform behind one typed client.',
    role: 'Designer and maintainer',
    period: '2026',
    points: [
      'Backend-for-frontend token custody. The browser never holds a token: the session lives in a sealed httpOnly cookie and every API call is proxied server side.',
      'Cross-app sign-on by directed hand-off. A single-use, hash-stored ticket lands a user in a sibling app already signed in.',
      'Single-flight refresh with a server-side rotation receipt, which closed a concurrent-refresh race that had been signing users out without an error.',
      'Four packages versioned as one group with Changesets. 51 public releases through a human-approved publish pipeline, adopted by four products.',
    ],
    stack: 'TypeScript, React, Next.js App Router, pnpm, Turborepo, Vitest',
    link: { label: '@poly-x/sdk on npm', href: 'https://www.npmjs.com/package/@poly-x/sdk' },
  },
  {
    name: 'Alara Code',
    slug: 'alara-code',
    summary: 'Turns a client brief into a complete, human-approved software delivery pack.',
    role: 'Product owner and engineering lead',
    period: '2026',
    points: [
      'A gated document pipeline: scope, requirements, architecture, API and test specs, plan, proposal and tickets, with an approval at every step.',
      'Runs on hosted agents or a native multi-model engine, chosen per project.',
      'A prototype generator that proposes design directions per product, renders every screen at desktop and phone width, measures it and repairs what fails.',
      'Cut long document steps roughly threefold (one from 24 minutes to 8) by turning off model thinking where it did not pay for itself.',
      'About 6,400 automated backend tests. Live on dev and production Kubernetes.',
    ],
    stack: 'TypeScript, Node.js, Prisma, PostgreSQL, Redis, Next.js, Python, Playwright',
  },
  {
    name: 'Alara Space',
    slug: 'alara-space',
    summary: 'Multi-tenant team wiki that AI agents can read and write through MCP.',
    role: 'Built it and run it',
    period: '2026',
    points: [
      'Spaces holding trees of pages, folders and whiteboards, with version history, comments and owner approval for edits.',
      'An MCP server, so an agent can search, read and update the wiki as the user it acts for.',
      'Dev to production on Kubernetes: three releases in about a month behind an approval-gated pipeline, rolling out with zero restarts.',
      'Scale work: lazy page-tree loading, compression, paging, server timing and autoscaling from two to four replicas.',
    ],
    stack: 'Next.js, React, TypeScript, Prisma, PostgreSQL (ltree, pg_trgm), Kubernetes',
  },
  {
    name: 'Alara Plan',
    slug: 'alara-plan',
    summary: 'Project tracker with AI meeting minutes, support intake and an MCP server.',
    role: 'Platform and production lead',
    period: '2026',
    points: [
      'Moved the product to multi-tenancy across 32 tables and verified every row landed in an organisation.',
      'Capability-based access control: module and CRUD grants only, no hard-coded roles, enforced on API and UI, with a lint that requires tenant scoping on every query.',
      'Replaced a static secret and an OAuth server with per-user access tokens and rate limits for the MCP API.',
      'Support intake over Microsoft Graph: mailbox to ticket, AI triage, SLA monitoring and replies in the client\'s own thread.',
      'More than 2,300 backend and 1,480 frontend tests gate every change.',
    ],
    stack: 'TypeScript, Node.js, Prisma, PostgreSQL, Redis, BullMQ, Next.js, Microsoft Graph',
  },
  {
    name: 'ODIN',
    slug: 'odin',
    summary: 'Omni-channel customer engagement platform on a microservices backend.',
    role: 'Backend engineer',
    period: 'Since 2023',
    points: [
      'Real-time messaging, campaign and journey tools, analytics and a Python sentiment-analysis service.',
      'Scaled real-time traffic with Redis pub/sub behind NGINX load balancing.',
      'Led security remediation after a third-party penetration test.',
    ],
    stack: 'Node.js, Express, Socket.IO, MongoDB, Redis, BullMQ, Kafka, Python',
  },
];

export const experience = [
  {
    role: 'Senior Software Engineer',
    place: 'wAI Industries, Islamabad',
    period: 'Mar 2023 to now',
    note: 'Platform and product engineering across PolyX, the Alara suite and ODIN, from design through production operations.',
  },
  {
    role: 'Full Stack Developer',
    place: 'CodeFrenetics, Islamabad',
    period: 'Aug 2021 to Feb 2023',
    note: 'Hallocasa, an international real-estate platform with real-time chat. The ONIT ERP system. IoT control on Raspberry Pi. Stripe payments for a marketplace.',
  },
  {
    role: 'Android Developer Intern',
    place: 'Kryptohive, Rawalpindi',
    period: '2019 to 2020',
    note: 'Android applications in Java and mobile UI design.',
  },
  {
    role: 'BS Computer Science',
    place: 'National University of Modern Languages, Islamabad',
    period: '2017 to 2021',
    note: 'Final-year project: neural style transfer on Android.',
  },
];

export const stack = [
  { label: 'Platform', value: 'Kubernetes, ingress-nginx, autoscaling, network policies, Terraform, Azure, Docker' },
  { label: 'Delivery', value: 'Azure DevOps pipelines, tagged releases and rollback, TruffleHog and Trivy gates' },
  { label: 'Identity', value: 'SSO and identity providers, sessions, API keys, access tokens, rate limiting, module-based access control' },
  { label: 'AI', value: 'MCP servers, LLM features, speech-to-text pipelines, multi-agent development workflows' },
  { label: 'Code', value: 'TypeScript, Node.js, Next.js, React, Python, PostgreSQL, MongoDB, Redis, Kafka' },
];

// Display order: the newest product first, then the platform under it.
const ORDER = ['alara-code', 'polyx', 'polyx-sdk', 'alara-space', 'alara-plan', 'odin'];
export const ordered = [...projects].sort((a, b) => ORDER.indexOf(a.slug) - ORDER.indexOf(b.slug));
export const featured = ordered.slice(0, 2);
