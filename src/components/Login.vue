<template>
  <div class="login-container">
    <div class="login-card">
      <h2>Добро пожаловать!</h2>
      <p class="login-subtitle">Войдите в систему управления кондоминиумом</p>
      <form @submit.prevent="login">
        <div class="input-group">
          <label for="username">Логин</label>
          <input
              v-model="username"
              id="username"
              placeholder="Введите логин"
              autocomplete="username"
              required
          />
        </div>

        <div class="input-group">
          <label for="password">Пароль</label>
          <div class="password-wrapper">
            <input
                :type="showPassword ? 'text' : 'password'"
                v-model="password"
                id="password"
                placeholder="Введите пароль"
                autocomplete="current-password"
                required
            />
            <button
                type="button"
                class="toggle-password-btn"
                :aria-label="showPassword ? 'Скрыть пароль' : 'Показать пароль'"
                @click="togglePassword"
            >
              <span class="icon" v-if="showPassword">×</span>
              <span class="icon" v-else>👁</span>
            </button>
          </div>
        </div>

        <button
            type="submit"
            :disabled="loading"
            class="login-btn"
        >
          <span v-if="loading" class="loader"></span>
          <span v-else>Войти</span>
        </button>

        <div v-if="error" class="error">{{ error }}</div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref } from "vue";
import api from "../api";
import { useRouter } from "vue-router";

const username = ref("");
const password = ref("");
const error = ref("");
const loading = ref(false);

const showPassword = ref(false);

const router = useRouter();

async function login() {
  error.value = "";
  loading.value = true;
  try {
    await api.post("/login", {
      username: username.value,
      password: password.value,
    });
    router.push("/");
  } catch (e) {
    error.value = e.response?.data || "Ошибка входа";
  } finally {
    loading.value = false;
  }
}

function togglePassword() {
  showPassword.value = !showPassword.value;
}
</script>

<style scoped>
.login-container {
  min-height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  background: linear-gradient(120deg, #e0e7ff 0%, #fdf6e3 100%);
}
.login-card {
  width: 100%;
  max-width: 370px;
  background: #fff;
  border-radius: 18px;
  box-shadow: 0 8px 32px rgba(60, 80, 140, 0.13);
  padding: 36px 30px 30px 30px;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 16px;
}
h2 {
  text-align: center;
  margin-bottom: 4px;
  font-size: 28px;
  color: #252b40;
}
.login-subtitle {
  text-align: center;
  font-size: 15px;
  color: #7c8497;
  margin-bottom: 16px;
}
.input-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 14px;
  position: relative;
}
label {
  font-size: 15px;
  color: #546e7a;
  font-weight: 500;
}
input {
  padding: 10px 12px;
  font-size: 16px;
  border: 1px solid #e0e7ff;
  border-radius: 7px;
  transition: border-color 0.2s, background 0.2s;
  outline: none;
  background: #f5f7fa;
  width: 100%;
  box-sizing: border-box;
}
input:focus {
  border-color: #a7b2ff;
  background: #fff;
}
.password-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}
.password-wrapper input {
  padding-right: 44px;
}
.toggle-password-btn {
  position: absolute;
  top: 50%;
  right: 6px;
  transform: translateY(-50%);
  background: #f0f3f8;
  border: 1px solid #dfe5f0;
  border-radius: 6px;
  width: 34px;
  height: 32px;
  padding: 0;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 15px;
  line-height: 1;
  color: #4a5570;
  transition: background .15s, border-color .15s, color .15s;
}
.toggle-password-btn:hover {
  background: #e7ecf5;
  border-color: #c8d2e2;
}
.toggle-password-btn:active {
  background: #d8e1ef;
}
.toggle-password-btn:focus {
  outline: 2px solid #8fa8ff;
  outline-offset: 2px;
}
.login-btn {
  width: 100%;
  padding: 12px 0;
  background: linear-gradient(90deg, #4f8cff 0%, #6157ff 100%);
  color: #fff;
  font-size: 17px;
  border: none;
  border-radius: 7px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s, filter 0.2s;
  margin-top: 12px;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}
.login-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
  filter: grayscale(0.3);
}
.error {
  color: #e0393e;
  background: #ffeaea;
  margin-top: 15px;
  padding: 8px 10px;
  border-radius: 6px;
  font-size: 15px;
  text-align: center;
}
.loader {
  display: inline-block;
  width: 20px;
  height: 20px;
  border: 3px solid #fff;
  border-radius: 50%;
  border-right-color: #4f8cff;
  animation: spin 0.7s linear infinite;
  margin-right: 6px;
}
@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>