<!--
Carries content over from the previous slide: when you arrive from the slide
just before this one, the slot starts offset by (dx, dy) slide pixels and
slides into place. Pure translation, no fade or scale. Pair it with
`transition: none` on the previous slide so nothing else fades in between.

Measure dx/dy as (position on previous slide) − (position on this slide).
-->
<script setup>
import { ref } from 'vue'
import { onSlideEnter } from '@slidev/client'

const props = defineProps({
  dx: { type: Number, default: 0 },
  dy: { type: Number, default: 0 },
  duration: { type: Number, default: 1400 },
})

const el = ref()
onSlideEnter((to, from) => {
  if (from !== to - 1 || !el.value) return
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return
  el.value.animate(
    [{ transform: `translate(${props.dx}px, ${props.dy}px)` }, { transform: 'none' }],
    { duration: props.duration, easing: 'cubic-bezier(.45,0,.2,1)' },
  )
})
</script>

<template>
  <div ref="el" class="glide-from"><slot /></div>
</template>
