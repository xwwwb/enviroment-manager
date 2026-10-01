<script setup lang="ts">
defineProps<{
  eyebrow: string;
  title: string;
}>();
</script>

<template>
  <section class="page-heading">
    <div class="page-heading-content">
      <div class="eyebrow">{{ eyebrow }}</div>
      <h1>{{ title }}</h1>
      <slot />
    </div>
    <div v-if="$slots.actions" class="actions page-heading-actions">
      <slot name="actions" />
    </div>
  </section>
</template>
