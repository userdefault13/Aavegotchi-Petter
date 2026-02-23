<template>
  <div class="health-stats space-y-4">
    <div class="bg-white rounded-lg shadow p-6">
      <h2 class="text-2xl font-bold mb-4">Health & Stats</h2>

      <div v-if="loading" class="text-center py-8">
        <p class="text-gray-600">Loading health status...</p>
      </div>

      <div v-else class="space-y-6">
        <!-- Connection Status: Petter & Tunnel -->
        <div class="flex flex-wrap gap-3 p-4 rounded-lg bg-gray-50 border border-gray-200">
          <div class="flex items-center gap-2">
            <div
              class="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm"
              :class="connStatus.petter?.ok ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'"
            >
              <div class="w-2 h-2 rounded-full" :class="connStatus.petter?.ok ? 'bg-green-500' : 'bg-red-500'" />
              <span class="font-medium">Petter</span>
              <span>{{ connStatus.petter?.ok ? 'OK' : 'Offline' }}</span>
              <span v-if="connStatus.petter?.ok && connStatus.petter?.latencyMs" class="text-green-600">
                ({{ connStatus.petter.latencyMs }}ms)
              </span>
            </div>
            <div
              v-if="connStatus.tunnel !== null"
              class="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm"
              :class="connStatus.tunnel?.ok ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'"
            >
              <div class="w-2 h-2 rounded-full" :class="connStatus.tunnel?.ok ? 'bg-green-500' : 'bg-red-500'" />
              <span class="font-medium">Tunnel</span>
              <span>{{ connStatus.tunnel?.ok ? 'OK' : 'Offline' }}</span>
              <span v-if="connStatus.tunnel?.ok && connStatus.tunnel?.latencyMs" class="text-green-600">
                ({{ connStatus.tunnel.latencyMs }}ms)
              </span>
            </div>
          </div>
        </div>

        <!-- Health Status -->
        <div class="flex items-center gap-3 p-4 rounded-lg" :class="healthOk ? 'bg-green-50 border border-green-200' : 'bg-amber-50 border border-amber-200'">
          <div class="w-3 h-3 rounded-full" :class="healthOk ? 'bg-green-500' : 'bg-amber-500'" />
          <div>
            <p class="font-semibold" :class="healthOk ? 'text-green-800' : 'text-amber-800'">
              {{ healthOk ? 'System Healthy' : 'Check Status' }}
            </p>
            <p class="text-sm" :class="healthOk ? 'text-green-600' : 'text-amber-600'">
              Last checked: {{ formatDate(health?.timestamp) }}
            </p>
          </div>
        </div>

        <!-- Stats Grid -->
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div class="bg-gray-50 rounded-lg p-4">
            <p class="text-sm text-gray-600">Total Transactions</p>
            <p class="text-2xl font-bold">{{ stats?.transactions?.total ?? 0 }}</p>
          </div>
          <div class="bg-gray-50 rounded-lg p-4">
            <p class="text-sm text-gray-600">Aavegotchis Petted</p>
            <p class="text-2xl font-bold">{{ stats?.transactions?.totalAavegotchisPetted ?? 0 }}</p>
          </div>
          <div class="bg-gray-50 rounded-lg p-4">
            <p class="text-sm text-gray-600">Last 24h</p>
            <p class="text-2xl font-bold">{{ stats?.transactions?.last24h ?? 0 }}</p>
          </div>
          <div class="bg-gray-50 rounded-lg p-4">
            <p class="text-sm text-gray-600">Success Rate</p>
            <p class="text-2xl font-bold" :class="successRateColor">{{ stats?.successRate ?? 100 }}%</p>
          </div>
        </div>

        <!-- Bot Status -->
        <div class="border border-gray-200 rounded-lg p-4">
          <h3 class="font-semibold mb-2">Bot Status (Cloudflare)</h3>
          <div class="space-y-2 text-sm">
            <div class="flex justify-between">
              <span class="text-gray-600">Status</span>
              <span :class="stats?.bot?.running ? 'text-green-600 font-medium' : 'text-gray-500'">
                {{ stats?.bot?.running ? 'Running' : 'Stopped' }}
              </span>
            </div>
            <div v-if="stats?.bot?.lastRun" class="flex justify-between">
              <span class="text-gray-600">Last Run</span>
              <span>{{ formatDate(stats.bot.lastRun) }}</span>
            </div>
            <div v-if="stats?.bot?.lastError" class="flex justify-between">
              <span class="text-gray-600">Last Error</span>
              <span class="text-red-600 text-right max-w-xs truncate">{{ stats.bot.lastError }}</span>
            </div>
          </div>
        </div>

        <button
          @click="refresh"
          :disabled="loading"
          class="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50"
        >
          Refresh
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';

interface HealthResponse {
  status: string;
  timestamp: string;
  service: string;
  bot: { running: boolean; lastRun: string | null; lastError: string | null };
  stats: {
    totalTransactions: number;
    totalAavegotchisPetted: number;
    transactionsLast24h: number;
    errorsLast24h: number;
    successRate: number;
  };
}

interface ConnectionStatus {
  petter: { ok: boolean; latencyMs?: number; error?: string };
  tunnel: { ok: boolean; latencyMs?: number; error?: string } | null;
}

interface StatsResponse {
  bot: { running: boolean; lastRun: number | null; lastError: string | null };
  transactions: {
    total: number;
    last24h: number;
    last7d: number;
    totalAavegotchisPetted: number;
  };
  errors: { total: number; last24h: number };
  successRate: number;
}

const health = ref<HealthResponse | null>(null);
const stats = ref<StatsResponse | null>(null);
const connStatus = ref<ConnectionStatus>({ petter: { ok: false }, tunnel: null });
const loading = ref(true);

const healthOk = computed(() => health.value?.status === 'ok');

const successRateColor = computed(() => {
  const rate = stats.value?.successRate ?? 100;
  if (rate >= 95) return 'text-green-600';
  if (rate >= 80) return 'text-amber-600';
  return 'text-red-600';
});

const fetchHealth = async () => {
  try {
    const data = await $fetch<HealthResponse>('/api/health');
    health.value = data;
  } catch (err) {
    console.error('Failed to fetch health:', err);
  }
};

const fetchStats = async () => {
  try {
    const data = await $fetch<StatsResponse>('/api/stats');
    stats.value = data;
  } catch (err) {
    console.error('Failed to fetch stats:', err);
  }
};

const fetchConnectionStatus = async () => {
  try {
    const data = await $fetch<ConnectionStatus>('/api/connection-status');
    connStatus.value = data;
  } catch {
    connStatus.value = { petter: { ok: false }, tunnel: null };
  }
};

const refresh = async () => {
  loading.value = true;
  await Promise.all([fetchHealth(), fetchStats(), fetchConnectionStatus()]);
  loading.value = false;
};

const formatDate = (val: string | number | undefined) => {
  if (!val) return '—';
  const ts = typeof val === 'string' ? new Date(val).getTime() : val;
  return new Date(ts).toLocaleString();
};

onMounted(() => {
  refresh();
  setInterval(refresh, 30000);
  setInterval(fetchConnectionStatus, 15000);
});
</script>
