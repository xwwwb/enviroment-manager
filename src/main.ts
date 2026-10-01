import { createApp } from 'vue';
import {
  ElAlert,
  ElButton,
  ElCheckbox,
  ElCheckboxGroup,
  ElConfigProvider,
  ElDialog,
  ElDivider,
  ElEmpty,
  ElForm,
  ElFormItem,
  ElIcon,
  ElInput,
  ElOption,
  ElRadioButton,
  ElRadioGroup,
  ElSelect,
  ElSkeleton,
  ElSwitch,
  ElTag,
} from 'element-plus';
import 'element-plus/dist/index.css';
import 'highlight.js/styles/github.css';
import './style.css';
import './scrollbar.css';
import App from './App.vue';
import { createPinia } from 'pinia';
import { router } from './routers';

const app = createApp(App);
const components = {
  ElAlert,
  ElButton,
  ElCheckbox,
  ElCheckboxGroup,
  ElConfigProvider,
  ElDialog,
  ElDivider,
  ElEmpty,
  ElForm,
  ElFormItem,
  ElIcon,
  ElInput,
  ElOption,
  ElRadioButton,
  ElRadioGroup,
  ElSelect,
  ElSkeleton,
  ElSwitch,
  ElTag,
};
for (const [name, component] of Object.entries(components)) {
  app.component(name, component);
}
app.use(createPinia()).use(router).mount('#app');
