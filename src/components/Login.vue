<template>
  <div class="login-container">
    <h2>Вход</h2>
    <form @submit.prevent="login">
      <div>
        <label for="username">Логин:</label>
        <input v-model="username" id="username" required />
      </div>
      <div>
        <label for="password">Пароль:</label>
        <input v-model="password" id="password" type="password" required />
      </div>
      <button type="submit" :disabled="loading">Войти</button>
      <div v-if="error" class="error">{{ error }}</div>
    </form>
  </div>
</template>

<script setup>
import { ref } from "vue";
import axios from "axios";
import { useRouter } from "vue-router";

const username = ref("");
const password = ref("");
const error = ref("");
const loading = ref(false);
const router = useRouter();

async function login() {
  error.value = "";
  loading.value = true;
  try {
    const res = await axios.post("/api/login", {
      username: username.value,
      password: password.value,
    });
    // Успешный логин, редирект на главную (или другую страницу)
    router.push("/");
  } catch (e) {
    error.value = e.response?.data || "Ошибка входа";
  } finally {
    loading.value = false;
  }
}
</script>

<style>
.login-container {
  max-width: 400px;
  margin: 40px auto;
  padding: 20px;
  border: 1px solid #eee;
  border-radius: 8px;
  background: #fafafa;
}
.error {
  color: red;
  margin-top: 10px;
}
</style>