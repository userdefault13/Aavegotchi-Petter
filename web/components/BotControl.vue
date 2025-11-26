<template>
  <div class="bot-control space-y-4">
    <div class="bg-white rounded-lg shadow p-6">
      <h2 class="text-2xl font-bold mb-4">Bot Control</h2>
      
      <div v-if="loading" class="text-center py-4">
        <p class="text-gray-600">Loading...</p>
      </div>
      
      <div v-else class="space-y-4">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-600">Status</p>
            <p class="text-lg font-semibold" :class="status.running ? 'text-green-600' : 'text-red-600'">
              {{ status.running ? 'Running' : 'Stopped' }}
            </p>
          </div>
          <div v-if="status.lastRun">
            <p class="text-sm text-gray-600">Last Run</p>
            <p class="text-lg font-semibold">{{ formatDate(status.lastRun) }}</p>
          </div>
        </div>
        
        <div v-if="status.lastError" class="bg-red-50 border border-red-200 rounded-lg p-4">
          <p class="text-red-800 font-medium">Last Error</p>
          <p class="text-red-600 text-sm mt-1">{{ status.lastError }}</p>
        </div>
        
        <div class="flex gap-4">
          <button
            @click="toggleBot"
            :disabled="toggling"
            :class="[
              'px-6 py-3 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed',
              status.running
                ? 'bg-red-600 text-white hover:bg-red-700'
                : 'bg-green-600 text-white hover:bg-green-700'
            ]"
          >
            {{ toggling ? 'Processing...' : status.running ? 'Stop Bot' : 'Start Bot' }}
          </button>
          
          <button
            @click="triggerBot"
            :disabled="triggering"
            class="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {{ triggering ? 'Running...' : 'Trigger Now' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';

interface BotState {
  running: boolean;
  lastRun?: number;
  lastError?: string;
}

const status = ref<BotState>({ running: false });
const loading = ref(true);
const toggling = ref(false);
const triggering = ref(false);

const fetchStatus = async () => {
  try {
    const data = await $fetch<BotState>('/api/bot/status');
    status.value = data;
  } catch (err) {
    console.error('Failed to fetch bot status:', err);
  } finally {
    loading.value = false;
  }
};

const toggleBot = async () => {
  toggling.value = true;
  try {
    const endpoint = status.value.running ? '/api/bot/stop' : '/api/bot/start';
    await $fetch(endpoint, { method: 'POST' });
    await fetchStatus();
  } catch (err) {
    console.error('Failed to toggle bot:', err);
    alert('Failed to toggle bot status');
  } finally {
    toggling.value = false;
  }
};

const triggerBot = async () => {
  triggering.value = true;
  try {
    const result = await $fetch('/api/bot/trigger', { method: 'POST' });
    alert('Bot triggered successfully!');
    await fetchStatus();
  } catch (err: any) {
    console.error('Failed to trigger bot:', err);
    alert(err.message || 'Failed to trigger bot');
  } finally {
    triggering.value = false;
  }
};

const formatDate = (timestamp: number) => {
  return new Date(timestamp).toLocaleString();
};

onMounted(() => {
  fetchStatus();
  // Refresh status every 10 seconds
  setInterval(fetchStatus, 10000);
});
</script>

