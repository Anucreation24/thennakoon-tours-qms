# Thennakoon Tours Quotation Management System

A production-ready web application for Thennakoon Tours (Pvt) Ltd staff to manage vehicles, rate cards, and generate professional PDF quotations using the official letterhead background.

---

## 🚀 Technologies Used
- **Frontend**: Next.js 15 App Router, TypeScript, Tailwind CSS v4, Lucide Icons, date-fns.
- **Backend & Database**: Supabase (PostgreSQL, Row-Level Security, Database Functions, Database Triggers).
- **Authentication**: Supabase Auth.
- **File Storage**: Supabase Storage (Buckets for vehicle photos and company branding assets).
- **PDF Generation**: jsPDF, jsPDF-AutoTable.

---

## 🛠️ Complete Local Setup Guide

### Prerequisites
Make sure you have **Node.js (v18.0.0+)** installed on your system.

### 1. Clone & Install Dependencies
1. Navigate to the project directory:
   ```bash
   cd C:\Users\Skyfall\.gemini\antigravity\scratch\thennakoon-tours-qms
   ```
2. Install npm packages:
   ```bash
   npm install
   ```

### 2. Configure Environment Variables
Create a file named `.env.local` in the root of the project with the following contents:
```env
NEXT_PUBLIC_SUPABASE_URL=https://mxvjxtejugeyamgentuk.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im14dmp4dGVqdWdleWFtZ2VudHVrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQxMjYzNTQsImV4cCI6MjA5OTcwMjM1NH0.egQsifgVwkm-Y63pIn1XXS2CkoTz0uter7z-0l5G1MY
```
*(An example file `.env.example` has been provided for reference).*

### 3. Run Development Server
Start the Next.js local server:
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your web browser.

---

## 🔗 Supabase Connection & Setup Guide

The application is fully integrated with the active Supabase project `thennakoon-tours-qms` (Ref: `mxvjxtejugeyamgentuk`). 

### 1. Applied DDL Migrations
The initial tables, RLS policies, trigger logs, and seed records have already been successfully migrated to the database. They can be inspected inside:
`supabase/migrations/20260715000000_init.sql`

### 2. Storage Buckets
Two public storage buckets were created:
1. `vehicles`: For hosting vehicle profile photos.
2. `branding`: For hosting company logos, letterhead backgrounds, and bank QR codes.

#### RLS Storage Policies Applied:
- Read access is open to the public.
- Insert, Update, and Delete access is restricted to authenticated users only.

---

## 👤 Initial Owner Account Creation

Self-registration for staff is locked down. To register the primary owner:
1. Start the local server (`npm run dev`).
2. Navigate to: `http://localhost:3000/owner-setup`.
3. Fill in the Owner Full Name, Email, and Password.
4. Click **Initialize System**.
5. Once created, the `/owner-setup` route will automatically lock down to prevent further signups, and you will be redirected to `/login`.

---

## 📑 Verification & Test Checklist

Use this checklist to verify the system works:
1. **Authentication**:
   - Access `/dashboard` without logging in (should redirect to `/login`).
   - Create owner account at `/owner-setup`. Check database `profiles` table to verify role is set to `owner`.
   - Log in. Verify redirect to `/dashboard`.
2. **Vehicle Management**:
   - Add a new vehicle, upload an image. Verify it appears on the grid.
   - Archive a vehicle. Verify it is hidden from the main grid but visible in the "Archived" status filter.
3. **Rate Cards**:
   - Change a vehicle's rate.
   - Click the history button. Verify that the rate change is tracked with the timestamp and user info.
4. **Quotation Flow**:
   - Create a new quotation. Verify the selected vehicle autofills rates and images.
   - Override the rental days manually and verify that the Rental Total changes in real-time.
   - Verify calculation: `Grand Total = Subtotal + Tax - Discount`.
   - Click save and verify sequence `QT-2026-0001` is assigned.
5. **PDF Verification**:
   - Click preview on any quotation. Verify background letterhead fills A4 page.
   - Check text alignment. Check that terms and notes wrap correctly and do not overflow.

---

## ⚡ Vercel Deployment Guide

To deploy this project to Vercel:
1. Push this project folder to a GitHub repository.
2. Log in to [Vercel](https://vercel.com).
3. Import the repository.
4. Set the Framework Preset to **Next.js**.
5. Add the Environment Variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
6. Click **Deploy**.

---

## 📋 Completed Features & Known Limitations

### Completed Features:
- Role-based Route Guarding (Owner, Admin, Staff).
- User credentials management (Owner can edit/delete roles).
- Vehicle CRUD with Soft Archiving.
- Rate Cards tracking system with trigger logs.
- Multi-section Quotation Creator (Real-time math calculations).
- Safe sequence auto-numbering via PostgreSQL transactions.
- Base64-embedded PDF rendering with background watermarks.
- Duplication cloning for Staff.

### Known Limitations (Phase 1 Constraints):
- **Email/WhatsApp Integration**: PDF must be downloaded and sent manually.
- **Booking Calendar**: System checks active statuses but does not block overlapping rental dates.
- **Audit Logs**: Stored in database but a dashboard view is not implemented.
