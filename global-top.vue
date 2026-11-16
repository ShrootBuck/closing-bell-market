<script setup lang="ts">
// World's 100 largest companies by market cap, snapshot from companiesmarketcap.com on Nov 16 2026.
// Prices in USD. Logos live in public/logos. Rendered above every slide.
const quotes = [
  { r: 1, t: 'AAPL', p: '$353.20', c: '-0.86%', logo: 'AAPL.png' },
  { r: 2, t: 'MSFT', p: '$522.24', c: '-0.31%', logo: 'MSFT.png' },
  { r: 3, t: 'NVDA', p: '$156.96', c: '-3.62%', logo: 'NVDA.png' },
  { r: 4, t: 'GOOG', p: '$283.71', c: '-3.01%', logo: 'GOOG.png' },
  { r: 5, t: 'AMZN', p: '$257.95', c: '-3.27%', logo: 'AMZN.png' },
  { r: 6, t: 'TSM', p: '$376.53', c: '-5.57%', logo: 'TSM.png' },
  { r: 7, t: 'SPCX', p: '$136.41', c: '-1.94%', logo: 'SPCX.png' },
  { r: 8, t: 'ARAMCO', p: '$7.13', c: '+0.22%', logo: '2222.SR.png' },
  { r: 9, t: 'META', p: '$626.56', c: '-2.36%', logo: 'META.png' },
  { r: 10, t: 'AVGO', p: '$333.64', c: '-3.85%', logo: 'AVGO.png' },
  { r: 11, t: 'TSLA', p: '$378.59', c: '-2.98%', logo: 'TSLA.png' },
  { r: 12, t: 'LLY', p: '$1,448', c: '+0.33%', logo: 'LLY.png' },
  { r: 13, t: 'BRK.B', p: '$593.11', c: '+0.03%', logo: 'BRK-B.png' },
  { r: 14, t: 'WMT', p: '$128.15', c: '+0.05%', logo: 'WMT.png' },
  { r: 15, t: 'SAMSUNG', p: '$148.51', c: '-4.47%', logo: '005930.KS.png' },
  { r: 16, t: 'JPM', p: '$341.86', c: '-1.25%', logo: 'JPM.png' },
  { r: 17, t: 'AMD', p: '$507.33', c: '-5.01%', logo: 'AMD.png' },
  { r: 18, t: 'MU', p: '$730.32', c: '-6.17%', logo: 'MU.png' },
  { r: 19, t: 'V', p: '$429.63', c: '+0.91%', logo: 'V.png' },
  { r: 20, t: 'JNJ', p: '$285.00', c: '-0.26%', logo: 'JNJ.png' },
  { r: 21, t: 'XOM', p: '$167.64', c: '-1.11%', logo: 'XOM.png' },
  { r: 22, t: 'SK HYNIX', p: '$845.17', c: '-7.89%', logo: '000660.KS.png' },
  { r: 23, t: 'MA', p: '$666.32', c: '+0.78%', logo: 'MA.png' },
  { r: 24, t: 'ASML', p: '$1,426', c: '-4.62%', logo: 'ASML.png' },
  { r: 25, t: 'ABBV', p: '$296.94', c: '+0.65%', logo: 'ABBV.png' },
  { r: 26, t: 'COST', p: '$1,110', c: '+0.38%', logo: 'COST.png' },
  { r: 27, t: 'CCB', p: '$1.84', c: '+1.24%', logo: '601939.SS.png' },
  { r: 28, t: 'TCEHY', p: '$49.60', c: '-0.34%', logo: 'TCEHY.png' },
  { r: 29, t: 'KO', p: '$99.30', c: '+0.05%', logo: 'KO.png' },
  { r: 30, t: 'CVX', p: '$217.69', c: '-1.00%', logo: 'CVX.png' },
  { r: 31, t: 'CXMT', p: '$5.74', c: '-4.10%', logo: '688825.SS.png' },
  { r: 32, t: 'PG', p: '$172.76', c: '+1.74%', logo: 'PG.png' },
  { r: 33, t: 'RO', p: '$502.44', c: '+0.53%', logo: 'RO.SW.png' },
  { r: 34, t: 'ABC', p: '$1.14', c: '+2.99%', logo: '601288.SS.png' },
  { r: 35, t: 'PLTR', p: '$162.51', c: '-3.26%', logo: 'PLTR.png' },
  { r: 36, t: 'ORCL', p: '$119.66', c: '-4.54%', logo: 'ORCL.png' },
  { r: 37, t: 'CSCO', p: '$94.25', c: '-1.45%', logo: 'CSCO.png' },
  { r: 38, t: 'UNH', p: '$411.04', c: '+0.88%', logo: 'UNH.png' },
  { r: 39, t: 'ICBC', p: '$1.03', c: '+2.15%', logo: '1398.HK.png' },
  { r: 40, t: 'MRK', p: '$146.80', c: '-0.65%', logo: 'MRK.png' },
  { r: 41, t: 'BOC', p: '$1.10', c: '+1.95%', logo: '601988.SS.png' },
  { r: 42, t: 'HD', p: '$347.86', c: '-0.24%', logo: 'HD.png' },
  { r: 43, t: 'BAC', p: '$50.24', c: '-1.54%', logo: 'BAC.png' },
  { r: 44, t: 'GE', p: '$327.58', c: '-1.27%', logo: 'GE.png' },
  { r: 45, t: 'PM', p: '$196.24', c: '-1.37%', logo: 'PM.png' },
  { r: 46, t: 'NVS', p: '$161.72', c: '+0.76%', logo: 'NVS.png' },
  { r: 47, t: 'HSBC', p: '$88.65', c: '-1.08%', logo: 'HSBC.png' },
  { r: 48, t: 'INTC', p: '$55.61', c: '-6.80%', logo: 'INTC.png' },
  { r: 49, t: 'MS', p: '$185.23', c: '-2.84%', logo: 'MS.png' },
  { r: 50, t: 'AZN', p: '$185.00', c: '+0.30%', logo: 'AZN.png' },
  { r: 51, t: 'AMAT', p: '$355.29', c: '-4.11%', logo: 'AMAT.png' },
  { r: 52, t: 'RY', p: '$200.80', c: '-0.75%', logo: 'RY.png' },
  { r: 53, t: 'SHEL', p: '$98.04', c: '-1.05%', logo: 'SHEL.png' },
  { r: 54, t: 'NESN', p: '$106.89', c: '+0.46%', logo: 'NESN.SW.png' },
  { r: 55, t: 'MOUTAI', p: '$217.82', c: '+1.30%', logo: '600519.SS.png' },
  { r: 56, t: 'SAP', p: '$235.23', c: '+0.14%', logo: 'SAP.png' },
  { r: 57, t: 'TXN', p: '$296.97', c: '-2.18%', logo: 'TXN.png' },
  { r: 58, t: 'OR', p: '$505.67', c: '-0.23%', logo: 'OR.PA.png' },
  { r: 59, t: 'LRCX', p: '$213.80', c: '-5.36%', logo: 'LRCX.png' },
  { r: 60, t: 'RTX', p: '$196.92', c: '-0.83%', logo: 'RTX.png' },
  { r: 61, t: 'CAT', p: '$577.74', c: '-3.74%', logo: 'CAT.png' },
  { r: 62, t: 'TMO', p: '$698.92', c: '-0.18%', logo: 'TMO.png' },
  { r: 63, t: 'GS', p: '$893.53', c: '-2.51%', logo: 'GS.png' },
  { r: 64, t: 'PANW', p: '$312.48', c: '-3.03%', logo: 'PANW.png' },
  { r: 65, t: 'WFC', p: '$85.05', c: '-1.16%', logo: 'WFC.png' },
  { r: 66, t: 'AMGN', p: '$468.28', c: '+0.56%', logo: 'AMGN.png' },
  { r: 67, t: 'TM', p: '$214.66', c: '+1.05%', logo: 'TM.png' },
  { r: 68, t: 'NFLX', p: '$61.29', c: '-1.38%', logo: 'NFLX.png' },
  { r: 69, t: 'PETROCHINA', p: '$1.32', c: '+0.58%', logo: '0857.HK.png' },
  { r: 70, t: 'LIN', p: '$527.92', c: '+0.35%', logo: 'LIN.png' },
  { r: 71, t: 'MUFG', p: '$21.30', c: '-2.45%', logo: 'MUFG.png' },
  { r: 72, t: 'ANET', p: '$186.89', c: '-5.27%', logo: 'ANET.png' },
  { r: 73, t: 'SIE', p: '$306.17', c: '-2.45%', logo: 'SIE.DE.png' },
  { r: 74, t: 'IBM', p: '$244.84', c: '-0.93%', logo: 'IBM.png' },
  { r: 75, t: 'BABA', p: '$91.44', c: '-3.12%', logo: 'BABA.png' },
  { r: 76, t: 'CRWD', p: '$220.00', c: '-2.91%', logo: 'CRWD.png' },
  { r: 77, t: 'MC', p: '$453.83', c: '+0.14%', logo: 'MC.PA.png' },
  { r: 78, t: 'CHINA MOBILE', p: '$10.26', c: '+0.12%', logo: '0941.HK.png' },
  { r: 79, t: 'AXP', p: '$319.13', c: '-0.46%', logo: 'AXP.png' },
  { r: 80, t: 'ITX', p: '$67.74', c: '+1.11%', logo: 'ITX.MC.png' },
  { r: 81, t: 'GILD', p: '$169.53', c: '+0.86%', logo: 'GILD.png' },
  { r: 82, t: 'DIS', p: '$118.82', c: '-0.13%', logo: 'DIS.png' },
  { r: 83, t: 'DELL', p: '$321.52', c: '-6.68%', logo: 'DELL.png' },
  { r: 84, t: 'GEV', p: '$770.91', c: '-4.01%', logo: 'GEV.png' },
  { r: 85, t: 'C', p: '$121.79', c: '-1.79%', logo: 'C.png' },
  { r: 86, t: 'CBA', p: '$120.11', c: '+0.16%', logo: 'CBA.AX.png' },
  { r: 87, t: 'PEP', p: '$147.12', c: '+1.15%', logo: 'PEP.png' },
  { r: 88, t: 'ALV', p: '$533.81', c: '-0.42%', logo: 'ALV.DE.png' },
  { r: 89, t: 'TD', p: '$122.04', c: '-1.39%', logo: 'TD.png' },
  { r: 90, t: 'TTE', p: '$90.23', c: '-0.56%', logo: 'TTE.png' },
  { r: 91, t: 'MCD', p: '$275.54', c: '+1.31%', logo: 'MCD.png' },
  { r: 92, t: 'BHP', p: '$76.49', c: '-3.77%', logo: 'BHP.png' },
  { r: 93, t: 'SHOP', p: '$149.98', c: '+1.96%', logo: 'SHOP.png' },
  { r: 94, t: 'RELIANCE', p: '$14.24', c: '+0.38%', logo: 'RELIANCE.NS.png' },
  { r: 95, t: 'VZ', p: '$46.48', c: '+0.26%', logo: 'VZ.png' },
  { r: 96, t: 'KLAC', p: '$146.48', c: '-3.69%', logo: 'KLAC.png' },
  { r: 97, t: 'ARM', p: '$176.74', c: '-7.24%', logo: 'ARM.png' },
  { r: 98, t: 'ABT', p: '$108.62', c: '+0.09%', logo: 'ABT.png' },
  { r: 99, t: 'ADI', p: '$387.72', c: '-2.57%', logo: 'ADI.png' },
  { r: 100, t: 'IHC', p: '$85.50', c: '+0.00%', logo: 'IHC.AE.png' },
]
const logoUrl = (f: string) => `${import.meta.env.BASE_URL}logos/${f}`
</script>

<template>
  <div class="cb-tape" aria-hidden="true">
    <div class="cb-track">
      <div v-for="k in 2" :key="k" class="cb-seg">
        <span v-for="q in quotes" :key="q.t + k" class="cb-q">
          <img class="cb-logo" :src="logoUrl(q.logo)" alt="" />
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
  animation: cb-scroll 520s linear infinite;
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
.cb-q {
  align-items: center;
}
.cb-logo {
  width: 16px;
  height: 16px;
  padding: 1px;
  border-radius: 4px;
  background: #eff4e7;
  object-fit: contain;
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
