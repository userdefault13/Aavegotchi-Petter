<template>
  <div class="min-h-screen p-4">
    <div class="max-w-7xl mx-auto space-y-6">
      <div class="flex justify-between items-center">
        <h1 class="text-3xl font-bold">Dashboard</h1>
        <button
          @click="logout"
          class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
        >
          Logout
        </button>
      </div>
      
      <BotControl />
      <TransactionList />
      <ErrorList />
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';

const checkAuth = async () => {
  try {
    const response = await $fetch('/api/auth/check');
    if (!response.authenticated) {
      await navigateTo('/');
    }
  } catch (err) {
    await navigateTo('/');
  }
};

const logout = async () => {
  try {
    await $fetch('/api/auth/logout', { method: 'POST' });
    await navigateTo('/');
  } catch (err) {
    console.error('Failed to logout:', err);
  }
};

onMounted(() => {
  checkAuth();
});
</script>

