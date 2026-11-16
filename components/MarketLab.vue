<script setup lang="ts">
import { computed, ref } from 'vue'
import { onSlideEnter, useIsSlideActive } from '@slidev/client'
const active = useIsSlideActive()
const animationKey = ref(0)
onSlideEnter(() => animationKey.value++)
const props = defineProps<{ mode: 'supply' | 'stable' | 'unstable' | 'example' }>()
const price = ref(4), speed = ref(.5), expectations = ref(10), wide = ref(false)
const equilibrium = computed(() => props.mode === 'supply' ? 6 : props.mode === 'example' ? 50 / 3 : 10)
const demand = computed(() => 10 - price.value)
const supply = computed(() => -2 + price.value)
const horizon = computed(() => props.mode === 'example' ? wide.value ? 10 : 2.5 : 6)
const lo = computed(() => props.mode === 'example' ? wide.value ? -240 : -10 : 0)
const hi = computed(() => props.mode === 'example' ? 20 : 20)
const x = (n: number) => 44 + n / horizon.value * 370
const y = (n: number) => 208 - (n - lo.value) / (hi.value - lo.value) * 190
const curve = (initial: number) => Array.from({length:161}, (_,i) => {
  const t = i / 160 * horizon.value
  const value = props.mode === 'example' ? 50/3 - 35/3 * Math.exp(.3*t)
    : 10 + (initial - 10) * Math.exp((props.mode === 'stable' ? -speed.value : 5/expectations.value)*t)
  return x(t) + ',' + y(value)
}).join(' ')
const starts = computed(() => props.mode === 'stable' ? [2,6,14,18] : props.mode === 'unstable' ? [8,9.5,10.5,12] : [5])
const chartId = 'plot-' + props.mode
// In the 10-month view 0 and 20 sit only ~14px apart, so tick −120 instead of 20.
const axis = computed(() => props.mode === 'example' ? (wide.value ? [-240,-120,0] : [-10,0,20]) : [0,10,20])
</script>

<template>
<section :class="{ active }" class="market-lab" @keydown.stop @click.stop>
  <template v-if="mode === 'supply'">
    <svg viewBox="0 0 440 250" role="img" aria-label="Supply and demand. Move price to compare quantities.">
      <path d="M44 18V208H414" fill="none" stroke="#719a88"/>
      <path d="M44 55L352 208" fill="none" stroke="#70e6a7" stroke-width="3"/>
      <path d="M44 177L352 24" fill="none" stroke="#f5bd70" stroke-width="3"/>
      <path :d="'M44 '+(208-price*15.3)+'H414'" stroke="#d7eddf" stroke-dasharray="5 5"/>
      <circle :cx="44+Math.max(0,demand)*30.8" :cy="208-price*15.3" r="5" fill="#70e6a7"/>
      <circle :cx="44+Math.max(0,supply)*30.8" :cy="208-price*15.3" r="5" fill="#f5bd70"/>
      <text x="50" y="12">p</text><text x="414" y="232" text-anchor="end">quantity</text>
      <text x="62" y="44" fill="#70e6a7">demand</text><text x="358" y="29" fill="#f5bd70">supply</text>
      <text x="38" :y="213-price*15.3" text-anchor="end">{{ price.toFixed(1) }}</text>
      <circle cx="167.2" cy="116.2" r="3.5" fill="#d7eddf"/>
      <text x="167" y="104" text-anchor="middle">p* = 6</text>
    </svg>
    <label>Posted price <input v-model.number="price" type="range" min="2" max="10" step=".5" /><output>{{ price.toFixed(1) }}</output></label>
    <div class="lab-readout">Demand {{ demand.toFixed(1) }} · Supply {{ supply.toFixed(1) }}</div>
    <p class="lab-caption">{{ price < 6 ? 'Excess demand → price rises' : price > 6 ? 'Excess supply → price falls' : 'Quantities match → price holds' }}</p>
  </template>
  <template v-else>
    <button class="replay" @click="animationKey++" aria-label="Replay price paths">↻ Replay paths</button>
    <svg viewBox="0 0 440 250" role="img" :aria-label="mode === 'example' ? 'Numerical price path over time' : mode + ' price paths from four initial prices'">
      <defs><clipPath :id="chartId"><rect x="44" y="17" width="370" height="191"/></clipPath></defs>
      <path d="M44 18V208H414" fill="none" stroke="#719a88"/>
      <path v-for="value in axis" :key="value" :d="'M44 '+y(value)+'H414'" stroke="#284d40"/>
      <text v-for="value in axis" :key="'label'+value" x="38" :y="y(value)+5" text-anchor="end">{{ value }}</text>
      <path :d="'M44 '+y(equilibrium)+'H414'" stroke="#bad4c7" stroke-dasharray="5 5"/>
      <g :clip-path="'url(#'+chartId+')'">
        <polyline class="draw-curve" pathLength="1" v-for="(initial, index) in starts" :key="initial + animationKey" :style="{ animationDelay: (index * 120) + 'ms' }" :points="curve(initial)" fill="none" :stroke="mode === 'stable' ? '#70e6a7' : '#f5bd70'" stroke-width="3"/>
      </g>
      <!-- Labels go after the curves so their halo sits on top of any line. -->
      <text x="410" :y="y(equilibrium)-7" text-anchor="end">p* = {{ equilibrium.toFixed(mode === 'example' ? 2 : 0) }}</text>
      <text x="50" y="12">price</text><text x="44" y="230" text-anchor="middle">0</text><text x="414" y="230" text-anchor="end">{{ horizon }} {{ mode === 'example' ? 'months' : 'time units' }}</text>
    </svg>
    <template v-if="mode === 'stable'">
      <label>Speed λ(d₁+s₁) <input v-model.number="speed" type="range" min=".1" max="2" step=".05"/><output>{{ speed.toFixed(2) }}</output></label>
      <div class="phase-line">p &lt; p* <b>→ &nbsp; p* &nbsp; ←</b> p &gt; p*</div>
      <p class="lab-caption">Half the gap closes every {{ (Math.log(2)/speed).toFixed(2) }} time units.</p>
    </template>
    <template v-if="mode === 'unstable'">
      <label>Trend reaction d₂+s₂ <input v-model.number="expectations" type="range" min="2" max="20" step=".5"/><output>{{ expectations.toFixed(1) }}</output></label>
      <div class="phase-line">p &lt; p* <b>← &nbsp; p* &nbsp; →</b> p &gt; p*</div>
      <p class="lab-caption">d₁+s₁ = 5. Gap doubles every {{ (Math.log(2)*expectations/5).toFixed(2) }} time units.</p>
    </template>
    <template v-if="mode === 'example'">
      <div class="lab-buttons"><button :aria-pressed="!wide" @click="wide=false">First 2.5 months</button><button :aria-pressed="wide" @click="wide=true">First 10 months</button></div>
      <p class="lab-caption">Zero at 1.19 months · p(10) ≈ −$217.66</p>
    </template>
  </template>
</section>
</template>

<style scoped>
.market-lab{position:relative;background:#0b2d23;border:1px solid #315647;border-radius:12px;padding:14px}
svg{width:100%;height:190px;display:block;font:14px Arial,sans-serif;fill:#bad4c7;overflow:visible}
/* A halo in the panel colour, so a line passing a label goes behind the text. */
svg text{paint-order:stroke;stroke:#0b2d23;stroke-width:5px;stroke-linejoin:round}
label{display:grid;grid-template-columns:auto 1fr 42px;gap:9px;align-items:center;font:14px Arial,sans-serif;color:#d7eddf}
input{width:100%;accent-color:#70e6a7}output{text-align:right;font-variant-numeric:tabular-nums}
.lab-readout,.phase-line{font:16px Arial,sans-serif;margin-top:14px;text-align:center}
.phase-line b{padding:0 14px}
.market-lab .lab-caption{font:15px/1.35 Arial,sans-serif;margin:12px 0 0;color:#bad4c7}
.lab-buttons{display:flex;gap:8px}
button{background:#1c4535;border:1px solid #426c58;border-radius:6px;padding:8px;font:14px Arial;cursor:pointer;color:#d7eddf}
button[aria-pressed=true]{background:#d7eddf;color:white}
</style>

<style scoped>
.active .draw-curve{stroke-dasharray:1;stroke-dashoffset:1;animation:trace-price 1.5s cubic-bezier(.2,.6,.2,1) forwards}
@keyframes trace-price{to{stroke-dashoffset:0}}
.market-lab{box-shadow:0 18px 45px #001a1250}
button[aria-pressed=true]{background:#70e6a7;color:#09271e}
@media(prefers-reduced-motion:reduce){.active .draw-curve{animation:none;stroke-dashoffset:0}}
</style>
<style scoped>
.replay{display:block;margin:0 0 6px auto;font-size:12px;padding:4px 8px}
</style>
