<!--
Moves its content to another spot on the same slide when a click is reached.
Pure translation: it slides onto the element matched by `to` (an invisible
copy of the same content placed where it should end up) and slides back if
you click backwards. It travels sideways along its own line first, then
straight up or down, so it doesn't cut across whatever sits in between.

  <MoveOnClick :at="1" to=".a-corner .ghost">$a=\lambda(d_1+s_1)$</MoveOnClick>
-->
<script setup>
import { computed, nextTick, ref, watch } from 'vue'
import { useSlideContext } from '@slidev/client'

const props = defineProps({
  at: { type: Number, default: 1 },
  to: { type: String, required: true },
  duration: { type: Number, default: 1400 },
})

const { $clicks } = useSlideContext()
const el = ref()
const active = computed(() => $clicks.value >= props.at)
const offset = ref(null) // [dx, dy] in slide units, measured once
const shown = ref(false) // whether the final offset is applied

// Distance from where the content sits naturally to the target. Measured
// while no offset is applied, so the content is at its natural spot.
function measure() {
  const node = el.value
  const layout = node?.closest('.slidev-layout')
  const target = layout?.querySelector(props.to)
  if (!node || !target) return false
  const lr = layout.getBoundingClientRect()
  if (!lr.width) return false
  const k = lr.width / layout.offsetWidth || 1
  const a = node.getBoundingClientRect()
  const b = target.getBoundingClientRect()
  offset.value = [(b.left - a.left) / k, (b.top - a.top) / k]
  return true
}

const t = (x, y) => `translate(${x}px, ${y}px)`

function go(animate) {
  if (!offset.value && !measure()) {
    requestAnimationFrame(() => go(animate))
    return
  }
  const [dx, dy] = offset.value
  const to = active.value
  shown.value = to
  if (!animate || !el.value || matchMedia('(prefers-reduced-motion: reduce)').matches) return
  // Out: along the line, then up. Back: down, then along the line.
  const frames = to
    ? [{ transform: t(0, 0) }, { transform: t(dx, 0), offset: 0.55 }, { transform: t(dx, dy) }]
    : [{ transform: t(dx, dy) }, { transform: t(dx, 0), offset: 0.45 }, { transform: t(0, 0) }]
  el.value.animate(frames, { duration: props.duration, easing: 'cubic-bezier(.45,0,.2,1)' })
}

watch(active, () => nextTick(() => go(true)))
nextTick(() => { if (active.value) go(false) })

const style = computed(() => ({
  display: 'inline-block',
  transform: shown.value && offset.value ? t(...offset.value) : 'none',
}))
</script>

<template>
  <span ref="el" class="move-on-click" :style="style"><slot /></span>
</template>
