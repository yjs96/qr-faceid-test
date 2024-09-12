<script setup>
import QRCodeVue3 from 'qrcode-vue3';
import { QrcodeStream } from 'vue-qrcode-reader';

import { computed, ref } from 'vue'

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



const result = ref('')

function onDetect(detectedCodes) {
  console.log(detectedCodes)
  result.value = JSON.stringify(detectedCodes.map((code) => code.rawValue))
}

/*** select camera ***/

const selectedConstraints = ref({ facingMode: 'environment' })
const defaultConstraintOptions = [
  { label: 'rear camera', constraints: { facingMode: 'environment' } },
  { label: 'front camera', constraints: { facingMode: 'user' } }
]
const constraintOptions = ref(defaultConstraintOptions)

async function onCameraReady() {
  // NOTE: on iOS we can't invoke `enumerateDevices` before the user has given
  // camera access permission. `QrcodeStream` internally takes care of
  // requesting the permissions. The `camera-on` event should guarantee that this
  // has happened.
  const devices = await navigator.mediaDevices.enumerateDevices()
  const videoDevices = devices.filter(({ kind }) => kind === 'videoinput')

  constraintOptions.value = [
    ...defaultConstraintOptions,
    ...videoDevices.map(({ deviceId, label }) => ({
      label: `${label} (ID: ${deviceId})`,
      constraints: { deviceId }
    }))
  ]

  error.value = ''
}

/*** track functons ***/

function paintOutline(detectedCodes, ctx) {
  for (const detectedCode of detectedCodes) {
    const [firstPoint, ...otherPoints] = detectedCode.cornerPoints

    ctx.strokeStyle = 'red'

    ctx.beginPath()
    ctx.moveTo(firstPoint.x, firstPoint.y)
    for (const { x, y } of otherPoints) {
      ctx.lineTo(x, y)
    }
    ctx.lineTo(firstPoint.x, firstPoint.y)
    ctx.closePath()
    ctx.stroke()
  }
}
function paintBoundingBox(detectedCodes, ctx) {
  for (const detectedCode of detectedCodes) {
    const {
      boundingBox: { x, y, width, height }
    } = detectedCode

    ctx.lineWidth = 2
    ctx.strokeStyle = '#007bff'
    ctx.strokeRect(x, y, width, height)
  }
}
function paintCenterText(detectedCodes, ctx) {
  for (const detectedCode of detectedCodes) {
    const { boundingBox, rawValue } = detectedCode

    const centerX = boundingBox.x + boundingBox.width / 2
    const centerY = boundingBox.y + boundingBox.height / 2

    const fontSize = Math.max(12, (50 * boundingBox.width) / ctx.canvas.width)

    ctx.font = `bold ${fontSize}px sans-serif`
    ctx.textAlign = 'center'

    ctx.lineWidth = 3
    ctx.strokeStyle = '#35495e'
    ctx.strokeText(detectedCode.rawValue, centerX, centerY)

    ctx.fillStyle = '#5cb984'
    ctx.fillText(rawValue, centerX, centerY)
  }
}
const trackFunctionOptions = [
  { text: 'nothing (default)', value: undefined },
  { text: 'outline', value: paintOutline },
  { text: 'centered text', value: paintCenterText },
  { text: 'bounding box', value: paintBoundingBox }
]
const trackFunctionSelected = ref(trackFunctionOptions[1])

/*** barcode formats ***/

const barcodeFormats = ref({
  aztec: false,
  code_128: false,
  code_39: false,
  code_93: false,
  codabar: false,
  databar: false,
  databar_expanded: false,
  data_matrix: false,
  dx_film_edge: false,
  ean_13: false,
  ean_8: false,
  itf: false,
  maxi_code: false,
  micro_qr_code: false,
  pdf417: false,
  qr_code: true,
  rm_qr_code: false,
  upc_a: false,
  upc_e: false,
  linear_codes: false,
  matrix_codes: false
})
const selectedBarcodeFormats = computed(() => {
  return Object.keys(barcodeFormats.value).filter((format) => barcodeFormats.value[format])
})

/*** error handling ***/

const error = ref('')

function onError(err) {
  error.value = `[${err.name}]: `

  if (err.name === 'NotAllowedError') {
    error.value += 'you need to grant camera access permission'
  } else if (err.name === 'NotFoundError') {
    error.value += 'no camera on this device'
  } else if (err.name === 'NotSupportedError') {
    error.value += 'secure context required (HTTPS, localhost)'
  } else if (err.name === 'NotReadableError') {
    error.value += 'is the camera already in use?'
  } else if (err.name === 'OverconstrainedError') {
    error.value += 'installed cameras are not suitable'
  } else if (err.name === 'StreamApiNotSupportedError') {
    error.value += 'Stream API is not supported in this browser'
  } else if (err.name === 'InsecureContextError') {
    error.value +=
      'Camera access is only permitted in secure context. Use HTTPS or localhost rather than HTTP.'
  } else {
    error.value += err.message
  }
}

const threshold = 150; // 새로고침을 트리거하는 당김 거리 (픽셀)
const pullDistance = ref(0);
const startY = ref(0);

const emit = defineEmits(['refresh']);

const onTouchStart = (e) => {
  startY.value = e.touches[0].clientY;
};

const onTouchMove = (e) => {
  const currentY = e.touches[0].clientY;
  pullDistance.value = Math.max(0, currentY - startY.value);
};

const onTouchEnd = () => {
  if (pullDistance.value > threshold) {
    refreshRandomNumber(); // 새로고침 시 랜덤 숫자 업데이트
    emit('refresh');
  }
  pullDistance.value = 0;
};

const randomNumber = ref(Math.floor(Math.random() * 1000)); // 초기 랜덤 숫자

const refreshRandomNumber = () => {
  randomNumber.value = Math.floor(Math.random() * 1000);
};

</script>

<template>
  <div>
    {{ randomNumber }}
  </div>
    <div
    class="pull-to-refresh"
    @touchstart="onTouchStart"
    @touchmove="onTouchMove"
    @touchend="onTouchEnd"
  >
    <div class="pull-to-refresh__indicator" :style="{ height: `${pullDistance}px` }">
      {{ pullDistance > threshold ? '놓아서 새로고침' : '당겨서 새로고침' }}
    </div>


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

      <p class="decode-result">
      Last result: <b>{{ result }}</b>
    </p>

    <div>
      <!-- <qrcode-stream
        :constraints="selectedConstraints"
        :track="trackFunctionSelected.value"
        :formats="selectedBarcodeFormats"
        @error="onError"
        @detect="onDetect"
        @camera-on="onCameraReady"
      /> -->
    </div>
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
