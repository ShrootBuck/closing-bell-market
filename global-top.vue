<script setup lang="ts">
// Real tickers, meme prices. Rendered above every slide.
const quotes = [
  // One 420 (AMC) and one 69 (SPY), kept far apart on the tape.
  { t: 'TSLA', p: '412.80', c: '+2.4%' },
  { t: 'GME', p: '27.35', c: '+18.6%' },
  { t: 'NVDA', p: '1,337.00', c: '+13.37%' },
  { t: 'AAPL', p: '232.15', c: '+1.8%' },
  { t: 'AMC', p: '4.20', c: '-3.10%' },
  { t: 'MSFT', p: '404.04', c: '-0.04%' },
  { t: 'AMZN', p: '314.15', c: '+3.14%' },
  { t: 'META', p: '666.66', c: '-6.66%' },
  { t: 'GOOGL', p: '177.77', c: '+7.77%' },
  { t: 'SPY', p: '6,812.40', c: '+0.69%' },
  { t: 'PLTR', p: '88.88', c: '+8.88%' },
  { t: 'COIN', p: '101.01', c: '-10.1%' },
  { t: 'NFLX', p: '1,234.56', c: '+1.23%' },
  { t: 'AMD', p: '164.30', c: '+2.1%' },
  { t: 'DIS', p: '99.99', c: '-0.01%' },
  { t: 'HOOD', p: '42.00', c: '+42.0%' },
  { t: 'BRK.B', p: '1,000,000.00', c: '+0.00%' },
]
</script>

<template>
  <div class="cb-tape" aria-hidden="true">
    <div class="cb-track">
      <div v-for="k in 2" :key="k" class="cb-seg">
        <span v-for="q in quotes" :key="q.t + k" class="cb-q">
          <b>{{ q.t }}</b>
          <span class="cb-p">{{ q.p }}</span>
          <span :class="q.c.startsWith('-') ? 'cb-dn' : 'cb-up'">{{ q.c.startsWith('-') ? '▼' : '▲' }} {{ q.c.replace(/^[+-]/, '') }}</span>
        </span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.cb-tape {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 26px;
  z-index: 20;
  overflow: hidden;
  white-space: nowrap;
  background: #03130d;
  border-bottom: 1px solid #d6b66c55;
  box-shadow: 0 4px 14px #00100a80;
  font: 600 12.5px/26px ui-monospace, 'SFMono-Regular', Menlo, monospace;
  pointer-events: none;
}
.cb-track {
  display: inline-flex;
  animation: cb-scroll 70s linear infinite;
}
.cb-seg {
  display: inline-flex;
}
.cb-q {
  display: inline-flex;
  gap: 8px;
  padding: 0 18px;
  border-right: 1px solid #ffffff14;
}
.cb-q b {
  color: #f0c95c;
  letter-spacing: 0.04em;
}
.cb-p {
  color: #eff4e7;
}
.cb-up {
  color: #3cf09a;
}
.cb-dn {
  color: #ff5c79;
}
@keyframes cb-scroll {
  from { transform: translateX(0); }
  to { transform: translateX(-50%); }
}
@media (prefers-reduced-motion: reduce) {
  .cb-track { animation: none; }
}
</style>
