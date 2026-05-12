import { Tasks, CustomCategories } from './collections.local';
import { getUserId } from './localAuth';
import { schedulePersist } from './localPersistence';
import { PRIORITIES, DEFAULT_CATEGORY_KEYS } from '../lib/constants';

function normalizeDue(value) {
  if (value === undefined || value === null || value === '') return null;
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) throw new Error('Invalid due date');
    return value;
  }
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) throw new Error('Invalid due date');
  return d;
}

export function insertTask(payload) {
  const userId = getUserId();
  if (!userId) throw new Error('Sign in required');
  const title = (payload.title || '').trim();
  if (!title) throw new Error('Title required');
  const categoryType = payload.categoryType;
  const customCategoryId = payload.customCategoryId || null;
  if (categoryType === 'custom' && !customCategoryId) throw new Error('Category required');
  if (categoryType !== 'custom' && customCategoryId) throw new Error('Invalid category');
  if (!PRIORITIES.includes(payload.priority)) throw new Error('Bad priority');
  if (!DEFAULT_CATEGORY_KEYS.includes(categoryType) && categoryType !== 'custom') {
    throw new Error('Bad category');
  }
  if (categoryType === 'custom') {
    const cat = CustomCategories.findOne({ _id: customCategoryId, userId });
    if (!cat) throw new Error('Invalid category');
  }
  const existing = Tasks.findOne({ userId }, { sort: { sortOrder: -1 } });
  const sortOrder = existing && typeof existing.sortOrder === 'number' ? existing.sortOrder + 1 : 0;
  Tasks.insert({
    userId,
    title,
    notes: payload.notes ? payload.notes.trim() : '',
    categoryType,
    customCategoryId: categoryType === 'custom' ? customCategoryId : null,
    priority: payload.priority,
    dueDate: normalizeDue(payload.dueDate),
    completed: false,
    sortOrder,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  schedulePersist();
}

export function updateTask(payload) {
  const userId = getUserId();
  if (!userId) throw new Error('Sign in required');
  const task = Tasks.findOne({ _id: payload.taskId, userId });
  if (!task) throw new Error('Task not found');
  const $set = { updatedAt: new Date() };
  if (typeof payload.title === 'string') {
    const t = payload.title.trim();
    if (!t) throw new Error('Title required');
    $set.title = t;
  }
  if (typeof payload.notes === 'string') $set.notes = payload.notes.trim();
  if (payload.priority) $set.priority = payload.priority;
  if (Object.prototype.hasOwnProperty.call(payload, 'dueDate')) {
    $set.dueDate = normalizeDue(payload.dueDate);
  }
  if (payload.categoryType) {
    $set.categoryType = payload.categoryType;
    if (payload.categoryType === 'custom') {
      const cid = payload.customCategoryId;
      if (!cid) throw new Error('Category required');
      const cat = CustomCategories.findOne({ _id: cid, userId });
      if (!cat) throw new Error('Invalid category');
      $set.customCategoryId = cid;
    } else {
      $set.customCategoryId = null;
    }
  }
  Tasks.update({ _id: payload.taskId, userId }, { $set });
  schedulePersist();
}

export function removeTask(taskId) {
  const userId = getUserId();
  if (!userId) throw new Error('Sign in required');
  Tasks.remove({ _id: taskId, userId });
  schedulePersist();
}

export function toggleTaskComplete(taskId) {
  const userId = getUserId();
  if (!userId) throw new Error('Sign in required');
  const task = Tasks.findOne({ _id: taskId, userId });
  if (!task) throw new Error('Task not found');
  Tasks.update({ _id: taskId, userId }, {
    $set: {
      completed: !task.completed,
      updatedAt: new Date(),
    },
  });
  schedulePersist();
}

export function reorderTasks(orderedIds) {
  const userId = getUserId();
  if (!userId) throw new Error('Sign in required');
  orderedIds.forEach((taskId, index) => {
    const exists = Tasks.findOne({ _id: taskId, userId });
    if (!exists) throw new Error('Invalid task');
    Tasks.update({ _id: taskId, userId }, {
      $set: {
        sortOrder: index,
        updatedAt: new Date(),
      },
    });
  });
  schedulePersist();
}

export function insertCategory(name) {
  const userId = getUserId();
  if (!userId) throw new Error('Sign in required');
  const trimmed = name.trim();
  if (!trimmed) throw new Error('Name required');
  const dup = CustomCategories.findOne({ userId, nameLower: trimmed.toLowerCase() });
  if (dup) throw new Error('Category exists');
  const last = CustomCategories.findOne({ userId }, { sort: { sortOrder: -1 } });
  const sortOrder = last && typeof last.sortOrder === 'number' ? last.sortOrder + 1 : 0;
  CustomCategories.insert({
    userId,
    name: trimmed,
    nameLower: trimmed.toLowerCase(),
    sortOrder,
    createdAt: new Date(),
  });
  schedulePersist();
}

export function removeCategory(categoryId) {
  const userId = getUserId();
  if (!userId) throw new Error('Sign in required');
  const cat = CustomCategories.findOne({ _id: categoryId, userId });
  if (!cat) throw new Error('Not found');
  Tasks.update(
    {
      userId,
      categoryType: 'custom',
      customCategoryId: categoryId,
    },
    {
      $set: {
        categoryType: 'personal',
        customCategoryId: null,
        updatedAt: new Date(),
      },
    },
    { multi: true },
  );
  CustomCategories.remove({ _id: categoryId, userId });
  schedulePersist();
}
