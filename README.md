# Ebdaey Platform

Build a production-ready MVP for a multi-tenant Arabic SaaS platform called إبداعي.

This platform allows mentors to create accounts, receive their own subdomain, upload video courses, and sell them online.

The system operates in Egypt and integrates with Kashier payment gateway.

The architecture must be multi-tenant from the beginning and enforce strict tenant isolation.

🚨 Critical Authentication Rule

Students can ONLY sign in through the mentor’s subdomain.

Example:

mentorname.ebdaey.com/account


There must be:

No global student login page on main domain

No cross-tenant student authentication

No shared student portal

Each mentor subdomain has its own:

Login

Registration

Student dashboard

Students are strictly attached to a single tenant.

1️⃣ Multi-Tenant Architecture (Mandatory)

Each mentor gets:

mentorname.ebdaey.com


Requirements:

Wildcard DNS routing

Tenant resolved from subdomain

Middleware to enforce tenant context

Every database query must be scoped by tenant_id

Prevent cross-tenant data leaks

Main domain:

ebdaey.com


Contains only:

Homepage

Mentor login/signup

Admin login

No student login here.

2️⃣ Roles & Access Control

A) Mentor

Signs up on main domain

Gets subdomain automatically

Logs into:

mentorname.ebdaey.com/admin


Manages courses, students, withdrawals

B) Student

Can only register via:

mentorname.ebdaey.com/account


Cannot log into other mentor subdomains

Cannot access global domain

Students table must include:

tenant_id

email (unique per tenant, not globally)

C) Admin (Platform Owner)

Logs into main domain admin panel

Can see all tenants

Can manage withdrawals

Can suspend mentors

3️⃣ Revenue Logic (Fixed)

Commission:

7% platform

2.5% Kashier

Total deduction = 9.5%

When payment succeeds:

mentor_net = amount * 0.905
platform_commission = amount * 0.07
gateway_fee = amount * 0.025


Store:

gross_amount

platform_fee

gateway_fee

mentor_net

All payments go to platform Kashier account.

4️⃣ Tenant-Scoped Student Flow

Student Journey

Student visits:

mentorname.ebdaey.com


Opens course page

Clicks buy

Goes to checkout

Registers account (if not logged in)

Pays

Gains access to:

mentorname.ebdaey.com/account


Enrollment is tenant-specific.

Students cannot see or access courses from other mentors.

5️⃣ Core MVP Features

A) Mentor Public Profile (Subdomain)

Displays:

Cover image

Profile image

Bio

Course list

Reviews

WhatsApp floating button

WhatsApp button visible on:

Profile

Cart

Checkout

Student dashboard

Not visible on:

Course landing page

B) Course System

Mentor can:

Create course

Add:

Title

Description

Thumbnail

Price (EGP only)

Sections

Lessons

Video upload

PDF upload

Publish toggle

Each course URL:

mentorname.ebdaey.com/course-slug


No certificates.
No drip.
No subscriptions.

C) Checkout (Single Item Only)

MVP must support:

One course per checkout

Simple cart

Coupon field

Kashier redirect or embedded

Webhook verification required

Idempotent payment processing

Automatic enrollment

Currency: EGP only.

D) Mentor Dashboard

Accessible via:

mentorname.ebdaey.com/admin


Sections:

Overview

Sales

Earnings

Orders count

Courses

CRUD

Publish toggle

Orders

Student name

Course

Payment status

Students

Name

Email

Course purchased

Coupons

Percentage or fixed

Expiry date

Withdrawal

Withdrawal Settings

Mentor must:

Enter full legal name

Upload national ID image

Enter IBAN

Submit for admin approval

Status:

Pending

Approved

Rejected

Mentor cannot request payout until approved.

Withdrawal Request

Enter amount

Submit

No minimum threshold

E) Admin Dashboard (Main Domain Only)

Admin can:

Mentors

View all mentors

Suspend / activate

View balances

View uploaded IDs

Withdrawals

Approve withdrawal settings

Approve withdrawal requests

Mark as paid

Sales

View all transactions

Filter by tenant

Commission is globally fixed.

6️⃣ Database Rules

Students table:

id

tenant_id

name

email (unique per tenant)

password

Courses:

tenant_id required

Orders:

tenant_id required

All queries must enforce:

WHERE tenant_id = currentTenant


7️⃣ Security Requirements

Tenant-aware authentication

Prevent login across subdomains

Secure signed URLs for videos

Webhook validation from Kashier

Role-based access control

Protect against IDOR vulnerabilities

8️⃣ Homepage (Main Domain)

Minimal:

Hero section

CTA “ابدأ الآن”

3 feature highlights

Footer

No marketplace.
No student browsing.

Platform works through mentor links only.

9️⃣ Non-Functional Requirements

RTL support

Mobile-first

Clean architecture

Scalable to 50+ mentors

No major refactor required for Phase 2

Proper environment configuration for subdomains

🔟 MVP Scope Boundaries

Do NOT build:

Marketplace

Stripe

Affiliate system

Email marketing

Analytics dashboards

Multi-currency

CAPI server-side tracking

Certificates

Drip content

Focus only on core course selling and tenant isolation.

Final Goal

Generate a stable, secure, scalable MVP that:

Supports multiple mentor subdomains

Enforces strict tenant-based authentication

Handles real Kashier payments

Supports manual withdrawal approval

Is production ready

Prioritize clean architecture over feature expansion.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://ebdaey.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/fd32d4e4-9e03-451a-9221-9b99cbb2daba).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

## Deployment on Vercel

This project is configured for Vercel deployment. Follow these steps:

### 1. Push to GitHub
```sh
git add .
git commit -m "Ready for deployment"
git push origin main
```

### 2. Deploy on Vercel
1. Go to [vercel.com](https://vercel.com)
2. Click "Add New Project"
3. Import your GitHub repository
4. Vercel will automatically detect Vite configuration

### 3. Add Environment Variables
In Vercel Project Settings > Environment Variables, add:

- `VITE_SUPABASE_URL`: Your Supabase project URL
- `VITE_SUPABASE_PUBLISHABLE_KEY`: Your Supabase anon/public key
- `VITE_SUPABASE_PROJECT_ID`: Your Supabase project ID

**Note:** Copy these values from your local `.env` file or Supabase dashboard.

### 4. Deploy
Click "Deploy" and wait for the build to complete.

### Environment Variables Reference
See `.env.example` for required environment variables format.

### Build Configuration
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Framework**: Vite (auto-detected)
