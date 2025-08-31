<template>
  <div class="login-container">
    <div class="login-card">
      <div class="lang-bar">
        <button
            type="button"
            class="lang-toggle"
            @click="switchLang"
            :aria-label="t('switchLangAria')"
        >
          {{ currentLang.toUpperCase() }}
        </button>
      </div>

      <h2>{{ t('title') }}</h2>
      <p class="login-subtitle">{{ t('subtitle') }}</p>

      <form @submit.prevent="login">
        <div class="input-group">
          <label for="username">{{ t('usernameLabel') }}</label>
          <input
              v-model="username"
              id="username"
              :placeholder="t('usernamePlaceholder')"
              autocomplete="username"
              required
          />
        </div>

        <div class="input-group">
          <label for="password">{{ t('passwordLabel') }}</label>
          <div class="password-wrapper">
            <input
                :type="showPassword ? 'text' : 'password'"
                v-model="password"
                id="password"
                :placeholder="t('passwordPlaceholder')"
                autocomplete="current-password"
                required
            />
            <button
                type="button"
                class="toggle-password-btn"
                :aria-label="showPassword ? t('hidePasswordAria') : t('showPasswordAria')"
                @click="togglePassword"
            >
              <span class="icon" v-if="showPassword">
                <!-- closed eye -->
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M3 3l18 18"/>
                  <path d="M10.58 10.58a3 3 0 0 0 4.24 4.24"/>
                  <path d="M9.88 5.74A9.46 9.46 0 0 1 12 5.5c5 0 8.5 3.5 10 6- .42.62-.9 1.22-1.43 1.8M6.12 6.12C4.07 7.42 2.53 9.24 2 11.5c1.5 2.5 5 6 10 6 1.3 0 2.5-.22 3.6-.6"/>
                </svg>
              </span>
              <span class="icon" v-else>
                <!-- open eye -->
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12Z"/>
                  <circle cx="12" cy="12" r="3"/>
                </svg>
              </span>
            </button>
          </div>
        </div>

        <button
            type="submit"
            :disabled="loading"
            class="login-btn"
        >
          <span v-if="loading" class="loader"></span>
          <span v-else>{{ t('loginBtn') }}</span>
        </button>

        <div v-if="error" class="error">{{ error }}</div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from "vue";
import api from "../api";
import { useRouter } from "vue-router";

// Simple dictionary (можно вынести в отдельный модуль)
const translations = {
  ru: {
    title: "Добро пожаловать!",
    subtitle: "Войдите в систему управления кондоминиумом",
    usernameLabel: "Логин",
    usernamePlaceholder: "Введите логин",
    passwordLabel: "Пароль",
    passwordPlaceholder: "Введите пароль",
    loginBtn: "Войти",
    hidePasswordAria: "Скрыть пароль",
    showPasswordAria: "Показать пароль",
    switchLangAria: "Переключить язык (RU/EN)",
    genericLoginError: "Ошибка входа",
  },
  en: {
    title: "Welcome!",
    subtitle: "Sign in to the condominium management system",
    usernameLabel: "Username",
    usernamePlaceholder: "Enter username",
    passwordLabel: "Password",
    passwordPlaceholder: "Enter password",
    loginBtn: "Sign In",
    hidePasswordAria: "Hide password",
    showPasswordAria: "Show password",
    switchLangAria: "Toggle language (RU/EN)",
    genericLoginError: "Login error",
  }
};

const stored = localStorage.getItem("lang");
const currentLang = ref(stored === "en" ? "en" : "ru");

function switchLang() {
  currentLang.value = currentLang.value === "ru" ? "en" : "ru";
  localStorage.setItem("lang", currentLang.value);
}

function t(key) {
  return translations[currentLang.value][key] || key;
}

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
    // попытка извлечь сообщение с сервера; если нет — локализованный generic
    const serverMsg = e.response?.data;
    if (typeof serverMsg === "string") {
      error.value = serverMsg;
    } else if (serverMsg?.message) {
      error.value = serverMsg.message;
    } else {
      error.value = t("genericLoginError");
    }
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
  position: relative;
}
.lang-bar {
  position: absolute;
  top: 10px;
  right: 12px;
}
.lang-toggle {
  background: #eef1f7;
  border: 1px solid #d5dbe6;
  border-radius: 8px;
  padding: 4px 10px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  letter-spacing: .5px;
  color: #374151;
  transition: background .15s, border-color .15s;
}
.lang-toggle:hover {
  background: #e2e7ef;
  border-color: #c3cddc;
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
.toggle-password-btn .icon {
  display: flex;
  align-items: center;
  justify-content: center;
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