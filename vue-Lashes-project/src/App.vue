<script setup lang="ts">
import TheNavbar from './components/TheNavbar.vue'
</script>

<template>
  <div class="app-shell">
    <TheNavbar />
    <main>
      <router-view />
    </main>
  </div>
</template>
<style scoped>
.app-shell {
  min-height: 100vh;
}


</style>
