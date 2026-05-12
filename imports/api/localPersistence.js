import { Meteor } from 'meteor/meteor';
import { Tasks, CustomCategories } from './collections.local';

const STORAGE_KEY = 'vtf-local-db';

function reviveDate(v) {
  if (v == null || v === '') return null;
  if (v instanceof Date) return v;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

function serializeDoc(doc) {
  const o = { ...doc };
  ['dueDate', 'createdAt', 'updatedAt'].forEach((k) => {
    if (o[k] instanceof Date) o[k] = o[k].toISOString();
  });
  return o;
}

export function hydrateLocalDatabase() {
  Tasks.find({})
    .fetch()
    .forEach((row) => Tasks.remove(row._id));
  CustomCategories.find({})
    .fetch()
    .forEach((row) => CustomCategories.remove(row._id));
  let raw;
  try {
    raw = localStorage.getItem(STORAGE_KEY);
  } catch (e) {
    void e;
    return;
  }
  if (!raw) return;
  let data;
  try {
    data = JSON.parse(raw);
  } catch (e) {
    void e;
    return;
  }
  (data.tasks || []).forEach((doc) => {
    Tasks.insert({
      ...doc,
      dueDate: reviveDate(doc.dueDate),
      createdAt: reviveDate(doc.createdAt),
      updatedAt: reviveDate(doc.updatedAt),
    });
  });
  (data.categories || []).forEach((doc) => {
    CustomCategories.insert({
      ...doc,
      createdAt: reviveDate(doc.createdAt),
    });
  });
}

let persistTimer;

export function schedulePersist() {
  Meteor.clearTimeout(persistTimer);
  persistTimer = Meteor.setTimeout(persistNow, 80);
}

function persistNow() {
  const tasks = Tasks.find({}).fetch().map(serializeDoc);
  const categories = CustomCategories.find({}).fetch().map(serializeDoc);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ tasks, categories, v: 1 }));
  } catch (e) {
    void e;
  }
}
