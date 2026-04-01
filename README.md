# 💅 Lash Booking System

A full-featured eyelash salon booking system built with Vue 3, simulating real-world business logic including service selection, scheduling, and admin management.

---

## 🚀 Tech Stack

* **Vue 3 + Vite**
* **TypeScript**
* **Pinia** (state management)
* **Vue Router**
* **localStorage** (data persistence)
* **Day.js** (time handling)

---

## ✨ Features

### 👩‍💻 User Booking Flow

* Service selection with category filtering
* Time slot selection with availability control
* Booking form with validation
* Real-time price calculation
* Persistent booking data (localStorage)

---

### 🛠 Admin Dashboard

* View all bookings
* Filter bookings by status
* Update booking status (pending / confirmed)
* Delete bookings

---

### 🧠 Core Business Logic

* **Time conflict detection** to prevent double booking
* **Business hours restriction**
* Unified booking data structure (UI → Store)
* Reactive data flow using Pinia

---

## 🏗 Project Structure

```bash
src/
├── components/
│   ├── booking/        # Booking flow components
│   ├── admin/          # Admin dashboard components
│   ├── home/           # Homepage UI components
│   ├── services/       # Service listing & filtering
│   └── TheNavbar.vue
│
├── views/
│   ├── HomeView.vue
│   ├── BookingView.vue
│   ├── ServicesView.vue
│   └── AdminView.vue
│
├── stores/
│   └── booking.ts      # Global booking state (Pinia)
│
├── utils/
│   └── booking.ts      # Business logic (conflict detection)
│
├── data/               # Mock data (services, time slots, etc.)
├── types/              # TypeScript interfaces
├── router/             # Route configuration
└── main.ts
```

---

## 🔄 Data Flow (Core Design)

1. UI components collect user input (service, date, time)
2. Data is transformed into a unified booking format
3. Stored in **Pinia store**
4. Synced to **localStorage**
5. Admin panel reads from the same store

👉 Ensures a **single source of truth** and consistent state across the app

---

## 🌟 Highlights

* Designed a **modular component architecture** (booking / admin / home separation)
* Implemented **state-driven UI updates** using Pinia
* Built **real-world scheduling logic** (time conflict detection)
* Structured project with **clear separation of concerns** (components / stores / utils / types)
* Strong focus on **data flow and maintainability**

---

## 📦 Installation

```bash
npm install
npm run dev
```

---

## 📸 Screenshots

> Add UI screenshots here (Home / Booking / Admin)

---

## 🚧 Future Improvements

* Multi-step booking flow (step form)
* Backend integration (replace localStorage with API)
* User authentication system
* Mobile responsiveness & animation optimization

---
