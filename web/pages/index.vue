<template>
  <div class="min-h-screen flex items-center justify-center p-4">
    <div class="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
      <h1 class="text-3xl font-bold text-center mb-2">Aavegotchi Petter Bot</h1>
      <p class="text-gray-600 text-center mb-8">Control your automated petting bot</p>
      <WalletConnect />
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: false,
});
</script>

