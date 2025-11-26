<template>
  <div class="transaction-list">
    <div class="bg-white rounded-lg shadow p-6">
      <div class="flex justify-between items-center mb-4">
        <h2 class="text-2xl font-bold">Transaction History</h2>
        <button
          @click="refresh"
          :disabled="loading"
          class="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50"
        >
          Refresh
        </button>
      </div>
      
      <div v-if="loading" class="text-center py-8">
        <p class="text-gray-600">Loading transactions...</p>
      </div>
      
      <div v-else-if="transactions.length === 0" class="text-center py-8">
        <p class="text-gray-600">No transactions yet</p>
      </div>
      
      <div v-else class="space-y-4">
        <div
          v-for="tx in transactions"
          :key="tx.hash"
          class="border border-gray-200 rounded-lg p-4 hover:bg-gray-50"
        >
          <div class="flex justify-between items-start">
            <div class="flex-1">
              <div class="flex items-center gap-2 mb-2">
                <a
                  :href="`https://basescan.org/tx/${tx.hash}`"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="text-blue-600 hover:underline font-mono text-sm"
                >
                  {{ tx.hash.slice(0, 10) }}...{{ tx.hash.slice(-8) }}
                </a>
                <span class="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">Success</span>
              </div>
              <div class="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p class="text-gray-600">Block</p>
                  <p class="font-semibold">{{ tx.blockNumber }}</p>
                </div>
                <div>
                  <p class="text-gray-600">Gas Used</p>
                  <p class="font-semibold">{{ tx.gasUsed }}</p>
                </div>
                <div>
                  <p class="text-gray-600">Time</p>
                  <p class="font-semibold">{{ formatDate(tx.timestamp) }}</p>
                </div>
                <div>
                  <p class="text-gray-600">Aavegotchis Petted</p>
                  <p class="font-semibold">{{ tx.tokenIds.length }}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';

interface Transaction {
  hash: string;
  timestamp: number;
  blockNumber: number;
  gasUsed: string;
  tokenIds: string[];
}

const transactions = ref<Transaction[]>([]);
const loading = ref(true);

const fetchTransactions = async () => {
  loading.value = true;
  try {
    const data = await $fetch<Transaction[]>('/api/transactions');
    transactions.value = data;
  } catch (err) {
    console.error('Failed to fetch transactions:', err);
  } finally {
    loading.value = false;
  }
};

const refresh = () => {
  fetchTransactions();
};

const formatDate = (timestamp: number) => {
  return new Date(timestamp).toLocaleString();
};

onMounted(() => {
  fetchTransactions();
  // Refresh every 30 seconds
  setInterval(fetchTransactions, 30000);
});
</script>

