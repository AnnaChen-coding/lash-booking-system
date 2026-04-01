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

<img width="1427" height="708" alt="Screenshot 2026-04-01 at 11 49 23" src="https://github.com/user-attachments/assets/f162adb1-2608-444b-8687-36783894c570" /><img width="872" height="603" alt="Screenshot 2026-04-01 at 11 49 34" src="https://github.com/user-attachments/assets/b1d1d449-0127-42c8-a5f4-9f94877eabaf" /><img width="1297" height="685" alt="Screenshot 2026-04-01 at 11 50 12" src="https://github.com/user-attachments/assets/96adf438-5544-4f14-8a00-94358dbe222d" /><img width="1272" height="706" alt="Screenshot 2026-04-01 at 11 50 21" src="https://github.com/user-attachments/assets/a2e2e5a7-27db-45be-9cab-6be1704f4ea4" /><img width="1105" height="679" alt="Screenshot 2026-04-01 at 11 50 31" src="https://github.com/user-attachments/assets/261d22a6-be9f-4ff3-9071-21445e741e52" /><img width="1017" height="581" alt="Screenshot 2026-04-01 at 11 50 39" src="https://github.com/user-attachments/assets/321f946b-95b9-49a6-a744-946170e6c1a9" /><img width="1037" height="584" alt="Screenshot 2026-04-01 at 11 51 00" src="https://github.com/user-attachments/assets/6e78aec3-9506-469c-8c0c-87f126eb0bc7" />







---

## 🚧 Future Improvements

* Multi-step booking flow (step form)
* Backend integration (replace localStorage with API)
* User authentication system
* Mobile responsiveness & animation optimization

---
