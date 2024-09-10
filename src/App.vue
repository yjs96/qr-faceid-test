<script setup>
import QRCodeVue3 from 'qrcode-vue3';

import { ref } from 'vue'

const authResult = ref('')
const isAuthenticated = ref(false)

const authenticate = async () => {
  if (!window.PublicKeyCredential) {
    authResult.value = 'Web Authentication API가 지원되지 않습니다.'
    return
  }

  try {
    const options = {
      publicKey: {
        challenge: new Uint8Array(32), // 서버에서 생성된 챌린지를 사용해야 합니다
        rp: {
          name: 'Your App Name',
          id: location.hostname
        },
        user: {
          id: new Uint8Array(16), // 사용자 ID를 적절히 설정해야 합니다
          name: 'user@example.com',
          displayName: 'User Name'
        },
        pubKeyCredParams: [{alg: -7, type: 'public-key'}],
        authenticatorSelection: {
          authenticatorAttachment: 'platform',
          userVerification: 'required'
        },
        timeout: 60000
      }
    }

    const credential = await navigator.credentials.create(options)
    authResult.value = '인증 성공!'
    isAuthenticated.value = true
    console.log('Credential', credential)
  } catch (error) {
    authResult.value = `인증 실패: ${error.message}`
    isAuthenticated.value = false
    console.error('Authentication error', error)
  }
}
</script>

<template>
  <div>
    <button @click="authenticate">FaceID로 인증하기</button>
    <p v-if="authResult">{{ authResult }}</p>
    
    <div v-if="isAuthenticated" class="auth-success">
      인증된 사용자입니다. 환영합니다!
    </div>
    <div v-else class="auth-pending">
      인증이 필요합니다. 위 버튼을 클릭하여 인증해주세요.
    </div>
  </div>
  <div>


    <QRCodeVue3
          :width="200"
          :height="200"
          value="{userid=1,docno=12}"
          :qrOptions="{ typeNumber: 0, mode: 'Byte', errorCorrectionLevel: 'H' }"
          :imageOptions="{ hideBackgroundDots: false, imageSize: 0, margin: 0 }"
          :dotsOptions="{
            type: 'square',
            color: '#000000',
            gradient: {
              type: 'linear',
              rotation: 0,
              colorStops: [
                { offset: 0, color: '#000000' },
                { offset: 1, color: '#000000' },
              ],
            },
          }"
          :backgroundOptions="{ color: '#ffffff' }"
          :cornersSquareOptions="{ type: 'square', color: '#000000' }"
          :cornersDotOptions="{ type: undefined, color: '#000000' }"
          fileExt="png"
          :download="true"
          myclass="my-qur"
          imgclass="img-qr"
          downloadButton="my-button"
          :downloadOptions="{ name: 'vqr', extension: 'png' }"
        />
      </div>
</template>

<style scoped>
header {
  line-height: 1.5;
  max-height: 100vh;
}

.logo {
  display: block;
  margin: 0 auto 2rem;
}

nav {
  width: 100%;
  font-size: 12px;
  text-align: center;
  margin-top: 2rem;
}

nav a.router-link-exact-active {
  color: var(--color-text);
}

nav a.router-link-exact-active:hover {
  background-color: transparent;
}

nav a {
  display: inline-block;
  padding: 0 1rem;
  border-left: 1px solid var(--color-border);
}

nav a:first-of-type {
  border: 0;
}

@media (min-width: 1024px) {
  header {
    display: flex;
    place-items: center;
    padding-right: calc(var(--section-gap) / 2);
  }

  .logo {
    margin: 0 2rem 0 0;
  }

  header .wrapper {
    display: flex;
    place-items: flex-start;
    flex-wrap: wrap;
  }

  nav {
    text-align: left;
    margin-left: -1rem;
    font-size: 1rem;

    padding: 1rem 0;
    margin-top: 1rem;
  }
}
</style>
