---
title: "Hosting Multiple Domains on One Server with Docker, NGINX & SSL (DevOps for Developers)"
description: "As a full-stack developer, I recently had to deploy multiple backend services on one server, each with its own domain and SSL certificate. Here's how I combined Docker, NGINX, and Certbot to build a scalable, production-grade setup — without needing a dedicated DevOps engineer."
date: 2025-07-13
tags: []
---

<p>As a full-stack developer, I usually focus on building features — not server orchestration. But recently, I needed to deploy three independent services (Alara, PolyX, Langflow) on a single cloud server. Each had its own domain name, microservices, databases, and required HTTPS.</p>
<p>This felt like a DevOps task. But instead of offloading it, I decided to learn it. Here's exactly how I pulled it off with Docker, NGINX, and Certbot.</p>

<h2>Problem Statement</h2>
<ul>
<li>One server (GCP VM)</li>
<li>Three services: <strong>Alara</strong>, <strong>PolyX</strong>, <strong>Langflow</strong></li>
<li>Each must be accessible from its own domain:</li>
<ul>
<li><code>https://alara-agents.com</code></li>
<li><code>https://poly-x.com</code></li>
<li><code>https://langflow.app</code></li>
</ul>
<li>Each service uses microservices (Node.js, Redis, MongoDB)</li>
<li>Each service is containerized with Docker</li>
<li>All domains must have valid SSL certificates (Let's Encrypt)</li>
</ul>

<h2>Solution Architecture</h2>
<p>I used a <strong>centralized NGINX reverse proxy</strong> pattern:</p>
<ol>
<li>One main NGINX container exposed on ports 80 and 443</li>
<li>Each app stack runs its own Docker services (on custom ports)</li>
<li>Domains are routed via NGINX <code>server_name</code> blocks</li>
<li>SSL certificates are handled via Certbot and mounted into NGINX</li>
</ol>

<h3>Folder Structure</h3>


```text
/projects
  ├── nginx-proxy/
  │   ├── docker-compose.yml
  │   └── conf.d/
  │       ├── alara.conf
  │       ├── polyx.conf
  │       └── langflow.conf
  ├── alara/
  │   └── docker-compose.yml
  ├── polyx/
  │   └── docker-compose.yml
  └── langflow/
      └── docker-compose.yml
```


<h2>Docker Networking Strategy</h2>
<p>I created a shared Docker network:</p>


```text
docker network create shared
```


<p>Each app and the NGINX container are connected to this shared network. This allows NGINX to proxy to containers by name (e.g., <code>alara-api:3000</code>).</p>

<h2>Central NGINX Setup</h2>
<p>Here’s a snippet from my main NGINX container’s compose file:</p>


```text
services:
    nginx:
      image: nginx:latest
      ports:
        - "80:80"
        - "443:443"
      volumes:
        - ./conf.d:/etc/nginx/conf.d
        - /etc/letsencrypt:/etc/letsencrypt
        - /var/www/certbot:/var/www/certbot
      networks:
        - shared
```


<h3>NGINX Domain Config (alara.conf)</h3>


```text
server {
    listen 80;
    server_name alara-agents.com;
  
    location /.well-known/acme-challenge/ {
      root /var/www/certbot;
    }
  
    location / {
      return 301 https://$host$request_uri;
    }
  }
  
  server {
    listen 443 ssl;
    server_name alara-agents.com;
  
    ssl_certificate /etc/letsencrypt/live/alara-agents.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/alara-agents.com/privkey.pem;
  
    location / {
      proxy_pass http://alara-api:3000;
      include proxy_params;
    }
  }
```


<p>I repeated this setup for <code>poly-x.com</code> and <code>langflow.app</code> as well.</p>

<h2>App Port Mapping (Avoiding Conflicts)</h2>
<p>Each service stack maps its internal ports to unique external ones. For example:</p>


```text
Alara:
    3100:3000 (API)
    3101:3001 (Auth)
    3102:5000 (Alerts)
  
  PolyX:
    3200:3000
    3201:4000
    3202:5000
  
  Langflow:
    3300:3000
    3301:5000
```


<p>MongoDB and Redis also get isolated ports per service. This eliminates any conflicts.</p>

<h2>SSL via Certbot</h2>
<p>I used Certbot in webroot mode (so it works behind NGINX):</p>


```text
docker run --rm -it \
    -v /etc/letsencrypt:/etc/letsencrypt \
    -v /var/www/certbot:/var/www/certbot \
    certbot/certbot certonly \
    --webroot --webroot-path=/var/www/certbot \
    -d alara-agents.com -d poly-x.com -d langflow.app
```


<p>Certificates are automatically mounted into the NGINX container.</p>

<h2>Auto-Renewal</h2>
<p>I set up a cron job to renew certificates and reload NGINX monthly:</p>


```text
0 3 * * * docker run --rm \
    -v /etc/letsencrypt:/etc/letsencrypt \
    -v /var/www/certbot:/var/www/certbot \
    certbot/certbot renew --webroot --webroot-path=/var/www/certbot \
    && docker exec nginx-proxy nginx -s reload
```


<h2>Result: 3 Domains, 1 Server, Full HTTPS</h2>
<ul>
<li><code>https://alara-agents.com</code> → Alara stack</li>
<li><code>https://poly-x.com</code> → PolyX stack</li>
<li><code>https://langflow.app</code> → Langflow stack</li>
</ul>
<p>All isolated, independently scalable, and SSL-secure — running on a single server.</p>

<h2>Key Takeaways</h2>
<ul>
<li>Use one NGINX reverse proxy to handle all domain routing</li>
<li>Keep Docker networks shared but services isolated</li>
<li>Use Certbot in webroot mode and mount volumes into NGINX</li>
<li>Map ports uniquely per app to prevent service collisions</li>
</ul>

<h2>Final Thoughts</h2>
<p>This experience taught me that as a full-stack dev, understanding DevOps makes you 10× more effective — especially when working solo or deploying to production. This setup is now part of my go-to deployment playbook.</p>
<p>Hope it helps you as much as it helped me!</p>
