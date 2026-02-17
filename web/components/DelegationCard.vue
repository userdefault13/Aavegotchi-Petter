<template>
  <div class="delegation-card">
    <div class="bg-white rounded-lg shadow p-6">
      <h2 class="text-2xl font-bold mb-2">EIP PetOperator Delegation</h2>
      <p class="text-gray-600 text-sm mb-4">
        Keep your Aavegotchis in your wallet. Approve our petter to pet on your behalf—no transfer needed.
      </p>

      <div v-if="loading" class="text-center py-4">
        <p class="text-gray-600">Loading...</p>
      </div>

      <div v-else class="space-y-4">
        <div class="bg-gray-50 rounded-lg p-4 font-mono text-sm break-all">
          <span class="text-gray-600">Petter address: </span>
          {{ petterAddress || '—' }}
        </div>

        <div class="space-y-2">
          <div class="flex items-center gap-2">
            <span
              class="w-3 h-3 rounded-full"
              :class="status?.approved ? 'bg-green-500' : 'bg-amber-500'"
            />
            <span>{{ status?.approved ? 'Approved' : 'Not approved' }}</span>
          </div>
          <div class="flex items-center gap-2">
            <span
              class="w-3 h-3 rounded-full"
              :class="status?.registered ? 'bg-green-500' : 'bg-gray-300'"
            />
            <span>{{ status?.registered ? 'Registered' : 'Not registered' }}</span>
          </div>
          <div v-if="status?.gotchiCount !== undefined" class="text-sm text-gray-600">
            {{ status.gotchiCount }} Aavegotchi(es) in your wallet
          </div>
        </div>

        <div class="flex flex-col gap-2">
          <button
            v-if="!status?.approved"
            @click="approveDelegation"
            :disabled="approving"
            class="px-6 py-3 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50 font-medium"
          >
            {{ approving ? 'Confirm in wallet...' : '1. Approve Petter (sign tx)' }}
          </button>
          <button
            v-else-if="status?.canRegister"
            @click="register"
            :disabled="registering"
            class="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 font-medium"
          >
            {{ registering ? 'Registering...' : '2. Register for Auto-Petting' }}
          </button>
          <div
            v-else-if="status?.registered"
            class="px-4 py-2 bg-green-100 text-green-800 rounded-lg text-sm"
          >
            ✓ You're all set! Your Aavegotchis will be petted every 12 hours.
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { getWalletClient, writeContract } from '@wagmi/core';
import { wagmiConfig } from '~/lib/wagmi';
import { AAVEGOTCHI_DIAMOND_ADDRESS, AAVEGOTCHI_FACET_ABI } from '~/lib/wagmi';

interface DelegationStatus {
  approved: boolean;
  registered: boolean;
  gotchiCount: number;
  petterAddress: string;
  canRegister: boolean;
}

const status = ref<DelegationStatus | null>(null);
const petterAddress = ref('');
const loading = ref(true);
const approving = ref(false);
const registering = ref(false);

const fetchStatus = async () => {
  try {
    const statusRes = await $fetch<DelegationStatus>('/api/delegation/status');
    status.value = statusRes;
    petterAddress.value = statusRes.petterAddress || '';
  } catch (err) {
    console.error('Failed to fetch delegation status:', err);
  } finally {
    loading.value = false;
  }
};

const approveDelegation = async () => {
  if (!petterAddress.value) {
    alert('Petter address not configured');
    return;
  }
  approving.value = true;
  try {
    const walletClient = await getWalletClient(wagmiConfig);
    if (!walletClient) {
      alert('Please connect your wallet first');
      return;
    }
    await writeContract(wagmiConfig, {
      address: AAVEGOTCHI_DIAMOND_ADDRESS,
      abi: AAVEGOTCHI_FACET_ABI,
      functionName: 'setPetOperatorForAll',
      args: [petterAddress.value as `0x${string}`, true],
    });
    await fetchStatus();
  } catch (err: any) {
    console.error('Approve failed:', err);
    alert(err.message || 'Approval failed');
  } finally {
    approving.value = false;
  }
};

const register = async () => {
  registering.value = true;
  try {
    await $fetch('/api/delegation/register', { method: 'POST' });
    await fetchStatus();
  } catch (err: any) {
    alert(err?.data?.message || err.message || 'Registration failed');
  } finally {
    registering.value = false;
  }
};

onMounted(() => {
  fetchStatus();
});
</script>
