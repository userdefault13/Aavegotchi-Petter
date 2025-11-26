<template>
  <div class="wallet-connect">
    <div v-if="!isConnected" class="space-y-4">
      <p class="text-gray-600">Connect your MetaMask wallet to continue</p>
      <button
        @click="connectWallet"
        :disabled="connecting"
        class="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {{ connecting ? 'Connecting...' : 'Connect Wallet' }}
      </button>
      <p v-if="error" class="text-red-600 text-sm">{{ error }}</p>
    </div>
    <div v-else class="space-y-4">
      <div class="bg-green-50 border border-green-200 rounded-lg p-4">
        <p class="text-green-800 font-medium">Connected</p>
        <p class="text-green-600 text-sm mt-1">{{ address }}</p>
      </div>
      <button
        v-if="!isAuthenticated"
        @click="signMessage"
        :disabled="signing"
        class="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {{ signing ? 'Signing...' : 'Sign Message to Login' }}
      </button>
      <button
        v-else
        @click="disconnectWallet"
        class="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700"
      >
        Disconnect
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { getAccount, connect, disconnect, signMessage as wagmiSignMessage } from '@wagmi/core';
import { wagmiConfig } from '~/lib/wagmi';
import { injected } from '@wagmi/core/connectors';

const address = ref<string>('');
const isConnected = ref(false);
const isAuthenticated = ref(false);
const connecting = ref(false);
const signing = ref(false);
const error = ref<string>('');

const ALLOWED_ADDRESS = '0x2127aa7265d573aa467f1d73554d17890b872e76'.toLowerCase();

const checkAuth = async () => {
  try {
    const response = await $fetch('/api/auth/check');
    isAuthenticated.value = response.authenticated;
  } catch (err) {
    isAuthenticated.value = false;
  }
};

const connectWallet = async () => {
  connecting.value = true;
  error.value = '';
  
  try {
    if (typeof window === 'undefined' || !window.ethereum) {
      throw new Error('MetaMask not found. Please install MetaMask.');
    }

    const connector = injected();
    const result = await connect(wagmiConfig, { connector });
    
    if (result.accounts && result.accounts[0]) {
      address.value = result.accounts[0];
      isConnected.value = true;
      
      if (result.accounts[0].toLowerCase() !== ALLOWED_ADDRESS) {
        error.value = 'Your address is not whitelisted. Only 0x2127aa7265d573aa467f1d73554d17890b872e76 is allowed.';
        isConnected.value = false;
      } else {
        await checkAuth();
      }
    }
  } catch (err: any) {
    error.value = err.message || 'Failed to connect wallet';
    isConnected.value = false;
  } finally {
    connecting.value = false;
  }
};

const signMessage = async () => {
  signing.value = true;
  error.value = '';
  
  try {
    const message = `Sign in to Aavegotchi Petter Bot\n\nAddress: ${address.value}\n\nThis request will not trigger a blockchain transaction or cost any gas fees.`;
    
    const signature = await wagmiSignMessage(wagmiConfig, {
      message,
      account: address.value as `0x${string}`,
    });
    
    const response = await $fetch('/api/auth/verify', {
      method: 'POST',
      body: {
        address: address.value,
        message,
        signature,
      },
    });
    
    if (response.success) {
      isAuthenticated.value = true;
      await navigateTo('/dashboard');
    }
  } catch (err: any) {
    error.value = err.message || 'Failed to sign message';
  } finally {
    signing.value = false;
  }
};

const disconnectWallet = async () => {
  try {
    await $fetch('/api/auth/logout', { method: 'POST' });
    await disconnect(wagmiConfig);
    isConnected.value = false;
    isAuthenticated.value = false;
    address.value = '';
    await navigateTo('/');
  } catch (err) {
    console.error('Failed to disconnect:', err);
  }
};

onMounted(async () => {
  if (typeof window !== 'undefined' && window.ethereum) {
    const account = getAccount(wagmiConfig);
    if (account.isConnected && account.address) {
      address.value = account.address;
      isConnected.value = true;
      await checkAuth();
    }
  }
});
</script>

