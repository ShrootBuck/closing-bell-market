<script setup lang="ts">
import { computed } from 'vue'
import katex from 'katex'
const props = defineProps<{tex: string; block?: boolean}>()
const html = computed(() => katex.renderToString(props.tex, {
  displayMode: !!props.block,
  throwOnError: true,
  output: 'htmlAndMathml',
  trust: false,
}))
</script>
<template><span class="math-tex" v-html="html" /></template>
