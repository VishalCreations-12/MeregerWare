import { ReactiveVar } from 'meteor/reactive-var';
import { Random } from 'meteor/random';

const userIdVar = new ReactiveVar(null);
const emailVar = new ReactiveVar(null);

export function initLocalAuth() {
  try {
    const raw = localStorage.getItem('vtf-session');
    if (!raw) return;
    const s = JSON.parse(raw);
    userIdVar.set(s.userId);
    emailVar.set(s.email || '');
  } catch (e) {
    void e;
  }
}

export function getUserId() {
  return userIdVar.get();
}

export function getEmail() {
  return emailVar.get();
}

function normalizeEmail(e) {
  return e.trim().toLowerCase();
}

function loadUsers() {
  try {
    return JSON.parse(localStorage.getItem('vtf-users') || '{}');
  } catch (e) {
    void e;
    return {};
  }
}

function saveUsers(users) {
  localStorage.setItem('vtf-users', JSON.stringify(users));
}

function commitSession(uid, em) {
  userIdVar.set(uid);
  emailVar.set(em);
  localStorage.setItem('vtf-session', JSON.stringify({ userId: uid, email: em }));
}

export function loginWithPassword(emailStr, password) {
  const users = loadUsers();
  const key = normalizeEmail(emailStr);
  const row = users[key];
  if (!row || row.password !== password) {
    throw new Error('Invalid email or password');
  }
  commitSession(row.userId, emailStr.trim());
}

export function createLocalUser({ email, password, profile }) {
  const users = loadUsers();
  const key = normalizeEmail(email);
  if (users[key]) {
    throw new Error('Email already registered');
  }
  const uid = Random.id();
  users[key] = {
    userId: uid,
    password,
    profile: profile || {},
  };
  saveUsers(users);
  commitSession(uid, email.trim());
}

export function logoutAccount() {
  userIdVar.set(null);
  emailVar.set(null);
  localStorage.removeItem('vtf-session');
}
