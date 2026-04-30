<template>
  <header class="navbar">
    <div class="left">
      <div class="brand">
        <picture>
          <source :srcset="logoWebp" type="image/webp" />
          <img :src="logoPng" alt="logo" class="logo" />
        </picture>
        <span class="brand-name">Gaza & Glaze</span>
      </div>
    </div>

    <div class="right">
      <nav class="nav-links">
        <RouterLink to="/">Home</RouterLink>
        <RouterLink to="/services">Services</RouterLink>
        <RouterLink to="/booking">Booking</RouterLink>
        <RouterLink v-if="auth.canAccessAdmin" to="/admin">Admin</RouterLink>
        <RouterLink v-else-if="!auth.isAuthenticated" to="/login">Login</RouterLink>
        <button v-if="auth.isAuthenticated" type="button" class="nav-logout" @click="onLogout">
          退出
        </button>
      </nav>
    </div>
  </header>
</template>

<style>
.navbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 40px;
  background: rgba(0, 0, 0, 0.7);
  color: var(--color-primary-light);

  position: sticky;
  top: 0;
  z-index: 100;

  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}
.brand {
  display: flex;
  align-items: center;
  gap: 10px;
}

.logo {
  height: 40px;
}

.brand-name {
  font-size: 40px;
  font-weight: 600;
  font-family: var(--font-heading);
}

.right {
  display: flex;
}

.nav-links {
  display: flex;
  gap: 40px;
  font-family: var(--font-heading);
}

.nav-links a {
  color: var(--color-primary-light);
  text-decoration: none;
  position: relative;
  display: inline-block;
  padding-bottom: 6px;
  font-size: var(--text-h3);
}

.nav-links a::after {
  content: "";
  position: absolute;
  left: 0;
  bottom: 0;

  width: 0;
  height: 2px;
  background-color: white;

  transition: width 0.3s ease;
}

.nav-links a:hover::after {
  width: 100%;
  background-color: var(--color-bg);
}

.nav-logout {
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.35);
  color: var(--color-primary-light);
  font-family: var(--font-heading);
  font-size: var(--text-h3);
  padding: 6px 14px;
  border-radius: 8px;
  cursor: pointer;
  align-self: center;
}

.nav-logout:hover {
  background: rgba(255, 255, 255, 0.08);
}
</style>
<script setup lang="ts">
import { useRouter } from "vue-router";
import { useAuthStore } from "@/stores/auth";
import logoPng from "@/assets/image/Gaze-&-Glaze--1773846583217/Gaze & Glaze -logo.png";
import logoWebp from "@/assets/image/Gaze-&-Glaze--1773846583217/Gaze & Glaze -logo.webp";

const auth = useAuthStore();
const router = useRouter();

const onLogout = async () => {
  await auth.logout();
  void router.push("/");
};
</script>
