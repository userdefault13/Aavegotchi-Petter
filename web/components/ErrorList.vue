<template>
  <div class="error-list">
    <div class="bg-white rounded-lg shadow p-6">
      <div class="flex justify-between items-center mb-4">
        <h2 class="text-2xl font-bold">Error Logs</h2>
        <div class="flex gap-2">
          <button
            @click="refresh"
            :disabled="loading"
            class="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50"
          >
            Refresh
          </button>
          <button
            @click="clearErrors"
            :disabled="clearing"
            class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
          >
            {{ clearing ? 'Clearing...' : 'Clear All' }}
          </button>
        </div>
      </div>
      
      <div v-if="loading" class="text-center py-8">
        <p class="text-gray-600">Loading errors...</p>
      </div>
      
      <div v-else-if="errors.length === 0" class="text-center py-8">
        <p class="text-gray-600">No errors logged</p>
      </div>
      
      <div v-else class="space-y-4">
        <div
          v-for="error in errors"
          :key="error.id"
          class="border border-red-200 rounded-lg p-4 bg-red-50"
        >
          <div class="flex justify-between items-start mb-2">
            <div>
              <p class="font-semibold text-red-800">{{ error.type }}</p>
              <p class="text-sm text-gray-600">{{ formatDate(error.timestamp) }}</p>
            </div>
          </div>
          <p class="text-red-700 mb-2">{{ error.message }}</p>
          <details v-if="error.stack" class="mt-2">
            <summary class="text-sm text-red-600 cursor-pointer hover:text-red-800">
              Show Stack Trace
            </summary>
            <pre class="mt-2 text-xs bg-red-100 p-2 rounded overflow-auto">{{ error.stack }}</pre>
          </details>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';

interface ErrorLog {
  id: string;
  timestamp: number;
  message: string;
  stack?: string;
  type: string;
}

const errors = ref<ErrorLog[]>([]);
const loading = ref(true);
const clearing = ref(false);

const fetchErrors = async () => {
  loading.value = true;
  try {
    const data = await $fetch<ErrorLog[]>('/api/errors');
    errors.value = data;
  } catch (err) {
    console.error('Failed to fetch errors:', err);
  } finally {
    loading.value = false;
  }
};

const refresh = () => {
  fetchErrors();
};

const clearErrors = async () => {
  if (!confirm('Are you sure you want to clear all error logs?')) {
    return;
  }
  
  clearing.value = true;
  try {
    await $fetch('/api/errors/clear', { method: 'POST' });
    await fetchErrors();
  } catch (err) {
    console.error('Failed to clear errors:', err);
    alert('Failed to clear errors');
  } finally {
    clearing.value = false;
  }
};

const formatDate = (timestamp: number) => {
  return new Date(timestamp).toLocaleString();
};

onMounted(() => {
  fetchErrors();
  // Refresh every 30 seconds
  setInterval(fetchErrors, 30000);
});
</script>

