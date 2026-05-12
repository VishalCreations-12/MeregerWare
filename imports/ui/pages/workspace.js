import { Template } from 'meteor/templating';
import { ReactiveVar } from 'meteor/reactive-var';
import { Tracker } from 'meteor/tracker';
import { FlowRouter } from 'meteor/ostrio:flow-router-extra';
import Sortable from 'sortablejs';
import './workspace.html';
import { Tasks, CustomCategories } from '../../api/collections.local';
import {
  insertCategory,
  insertTask,
  removeCategory,
  removeTask,
  reorderTasks,
  toggleTaskComplete,
  updateTask,
} from '../../api/localActions';
import { getEmail, getUserId, logoutAccount } from '../../api/localAuth';
import {
  CATEGORY_LABELS,
  DEFAULT_CATEGORY_KEYS,
  PRIORITIES,
  PRIORITY_LABELS,
} from '../../lib/constants';
import { layoutState } from '../../startup/client/layoutState';
import { toastNotify } from '../lib/toast';
import { confirmRequest } from '../lib/confirm';
import { themeMode, toggleTheme } from '../lib/theme';

function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function taskPartsForFilters(tpl) {
  const parts = [];
  const q = tpl.filterSearch.get().trim();
  if (q) {
    const rx = escapeRegex(q);
    parts.push({
      $or: [
        { title: { $regex: rx, $options: 'i' } },
        { notes: { $regex: rx, $options: 'i' } },
      ],
    });
  }
  const fc = tpl.filterCategory.get();
  if (fc && fc !== 'all') {
    if (fc.startsWith('custom:')) {
      parts.push({ categoryType: 'custom', customCategoryId: fc.slice(7) });
    } else {
      parts.push({ categoryType: fc, customCategoryId: null });
    }
  }
  const fcomp = tpl.filterCompletion.get();
  if (fcomp === 'pending') parts.push({ completed: false });
  if (fcomp === 'completed') parts.push({ completed: true });
  const fp = tpl.filterPriority.get();
  if (fp && fp !== 'all') parts.push({ priority: fp });
  return parts;
}

function taskQueryForFilters(tpl) {
  const uid = getUserId();
  if (!uid) return { userId: '__vtf_none__' };
  const fp = taskPartsForFilters(tpl);
  if (!fp.length) return { userId: uid };
  return { $and: [{ userId: uid }, ...fp] };
}

function filtersDefault(tpl) {
  return (
    !tpl.filterSearch.get().trim()
    && tpl.filterCategory.get() === 'all'
    && tpl.filterCompletion.get() === 'all'
    && tpl.filterPriority.get() === 'all'
  );
}

Template.workspacePage.onCreated(function () {
  const tpl = this;
  tpl.filterSearch = new ReactiveVar('');
  tpl.filterCategory = new ReactiveVar('all');
  tpl.filterCompletion = new ReactiveVar('all');
  tpl.filterPriority = new ReactiveVar('all');
  tpl.editorOpen = new ReactiveVar(false);
  tpl.editingId = new ReactiveVar(null);
});

Template.workspacePage.helpers({
  navOpenClass() {
    return layoutState.get('navOpen') ? 'is-open' : '';
  },
  themeLabel() {
    return themeMode.get() === 'dark' ? 'Light mode' : 'Dark mode';
  },
  userEmail() {
    return getEmail() || 'Operator';
  },
  dataReady() {
    getUserId();
    return true;
  },
  stats() {
    const uid = getUserId();
    const tasks = uid ? Tasks.find({ userId: uid }).fetch() : [];
    const total = tasks.length;
    const completed = tasks.filter((t) => t.completed).length;
    const pending = total - completed;
    const sod = startOfDay(new Date());
    const overdue = tasks.filter((t) => {
      if (t.completed || !t.dueDate) return false;
      const dd = t.dueDate instanceof Date ? t.dueDate : new Date(t.dueDate);
      return startOfDay(dd) < sod;
    }).length;
    const pct = total ? Math.round((completed / total) * 100) : 0;
    return { total, pending, completed, overdue, pct };
  },
  defaultCategoryButtons() {
    return DEFAULT_CATEGORY_KEYS.map((key) => ({
      key,
      label: CATEGORY_LABELS[key],
    }));
  },
  customCategoriesList() {
    const uid = getUserId();
    if (!uid) return [];
    return CustomCategories.find({ userId: uid }, { sort: { sortOrder: 1, name: 1 } })
      .fetch()
      .map((c) => ({
        ...c,
        filterValue: `custom:${c._id}`,
      }));
  },
  filteredTasks() {
    const tpl = Template.instance();
    return Tasks.find(taskQueryForFilters(tpl), { sort: { sortOrder: 1, createdAt: -1 } });
  },
  filteredEmpty() {
    const tpl = Template.instance();
    return Tasks.find(taskQueryForFilters(tpl)).count() === 0;
  },
  sortableClass() {
    const tpl = Template.instance();
    return filtersDefault(tpl) ? 'is-sortable' : '';
  },
  categoryLabel() {
    const task = Template.currentData();
    if (!task) return '';
    if (task.categoryType !== 'custom') return CATEGORY_LABELS[task.categoryType] || task.categoryType;
    const c = CustomCategories.findOne(task.customCategoryId);
    return c ? c.name : 'Custom';
  },
  priorityLabel() {
    const task = Template.currentData();
    if (!task) return '';
    return PRIORITY_LABELS[task.priority] || task.priority;
  },
  dueLabel() {
    const task = Template.currentData();
    if (!task || !task.dueDate || task.completed) return '';
    const d = task.dueDate instanceof Date ? task.dueDate : new Date(task.dueDate);
    const sodTask = startOfDay(d);
    const sodNow = startOfDay(new Date());
    const diffDays = Math.round((sodTask - sodNow) / 86400000);
    if (diffDays < 0) return 'Overdue';
    if (diffDays === 0) return 'Due today';
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  },
  dueClass() {
    const task = Template.currentData();
    if (!task || !task.dueDate || task.completed) return '';
    const d = task.dueDate instanceof Date ? task.dueDate : new Date(task.dueDate);
    const sodTask = startOfDay(d);
    const sodNow = startOfDay(new Date());
    const diffDays = Math.round((sodTask - sodNow) / 86400000);
    if (diffDays < 0) return 'is-overdue';
    if (diffDays === 0) return 'is-today';
    return 'is-upcoming';
  },
  editorOpen() {
    return Template.instance().editorOpen.get();
  },
  editorTitle() {
    return Template.instance().editingId.get() ? 'Edit task' : 'New task';
  },
  categoryOptions() {
    const uid = getUserId();
    const rows = DEFAULT_CATEGORY_KEYS.map((value) => ({
      value,
      label: CATEGORY_LABELS[value],
    }));
    if (!uid) return rows;
    CustomCategories.find({ userId: uid }, { sort: { sortOrder: 1, name: 1 } })
      .fetch()
      .forEach((c) => {
        rows.push({ value: `custom:${c._id}`, label: c.name });
      });
    return rows;
  },
  priorityOptions() {
    return PRIORITIES.map((value) => ({ value, label: PRIORITY_LABELS[value] }));
  },
});

Template.workspacePage.events({
  'click .js-open-nav'() {
    layoutState.set('navOpen', true);
  },
  'click .js-close-nav'() {
    layoutState.set('navOpen', false);
  },
  'click .js-nav-dash'(e) {
    e.preventDefault();
    layoutState.set('navOpen', false);
    const el = document.getElementById('vtf-dash');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  },
  'click .js-nav-board'(e) {
    e.preventDefault();
    layoutState.set('navOpen', false);
    const el = document.getElementById('vtf-board');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  },
  'click .js-filter-cat'(e, tpl) {
    tpl.filterCategory.set(e.currentTarget.getAttribute('data-value') || 'all');
  },
  'click .js-remove-cat'(e, tpl) {
    const id = e.currentTarget.getAttribute('data-id');
    confirmRequest('Remove this category? Tasks will move to Personal.', (ok) => {
      if (!ok) return;
      try {
        removeCategory(id);
        toastNotify('success', 'Category removed');
        if (tpl.filterCategory.get() === `custom:${id}`) tpl.filterCategory.set('all');
      } catch (err) {
        toastNotify('error', err.reason || err.message || String(err));
      }
    });
  },
  'submit .js-add-category'(e) {
    e.preventDefault();
    const name = e.target.name.value.trim();
    if (!name) return;
    try {
      insertCategory(name);
      toastNotify('success', 'Category added');
      e.target.name.value = '';
    } catch (err) {
      toastNotify('error', err.reason || err.message || String(err));
    }
  },
  'click .js-theme'() {
    toggleTheme();
  },
  'click .js-logout'() {
    logoutAccount();
    toastNotify('success', 'Signed out');
    FlowRouter.go('/login');
  },
  'input .vtf-input-search'(e, tpl) {
    tpl.filterSearch.set(e.target.value || '');
  },
  'change .js-filter-completion'(e, tpl) {
    tpl.filterCompletion.set(e.target.value || 'all');
  },
  'change .js-filter-priority'(e, tpl) {
    tpl.filterPriority.set(e.target.value || 'all');
  },
  'click .js-clear-filters'(e, tpl) {
    tpl.filterSearch.set('');
    tpl.filterCategory.set('all');
    tpl.filterCompletion.set('all');
    tpl.filterPriority.set('all');
    const root = e.currentTarget.closest('.vtf-shell');
    if (root) {
      const q = root.querySelector('.vtf-input-search');
      if (q) q.value = '';
      const fc = root.querySelector('.js-filter-completion');
      const fp = root.querySelector('.js-filter-priority');
      if (fc) fc.value = 'all';
      if (fp) fp.value = 'all';
    }
  },
  'click .js-open-create'(e, tpl) {
    tpl.editingId.set(null);
    tpl.editorOpen.set(true);
    Tracker.afterFlush(() => {
      const root = e.currentTarget.closest('.vtf-shell');
      const form = root ? root.querySelector('.js-task-form') : null;
      if (form) {
        form.title.value = '';
        form.notes.value = '';
        form.category.value = 'work';
        form.priority.value = 'medium';
        form.due.value = '';
      }
    });
  },
  'click .js-edit'(e, tpl) {
    const id = e.currentTarget.getAttribute('data-id');
    const task = Tasks.findOne(id);
    tpl.editingId.set(id);
    tpl.editorOpen.set(true);
    Tracker.afterFlush(() => {
      const root = e.currentTarget.closest('.vtf-shell');
      const form = root ? root.querySelector('.js-task-form') : null;
      if (!form || !task) return;
      form.title.value = task.title;
      form.notes.value = task.notes || '';
      form.priority.value = task.priority;
      const cat =
        task.categoryType === 'custom'
          ? `custom:${task.customCategoryId}`
          : task.categoryType;
      form.category.value = cat;
      if (task.dueDate) {
        const d = task.dueDate instanceof Date ? task.dueDate : new Date(task.dueDate);
        const y = d.getFullYear();
        const m = `${d.getMonth() + 1}`.padStart(2, '0');
        const day = `${d.getDate()}`.padStart(2, '0');
        form.due.value = `${y}-${m}-${day}`;
      } else {
        form.due.value = '';
      }
    });
  },
  'click .js-delete'(e) {
    const id = e.currentTarget.getAttribute('data-id');
    confirmRequest('Delete this task permanently?', (ok) => {
      if (!ok) return;
      try {
        removeTask(id);
        toastNotify('success', 'Task deleted');
      } catch (err) {
        toastNotify('error', err.reason || err.message || String(err));
      }
    });
  },
  'click .js-toggle'(e) {
    const id = e.currentTarget.getAttribute('data-id');
    try {
      toggleTaskComplete(id);
    } catch (err) {
      toastNotify('error', err.reason || err.message || String(err));
    }
  },
  'submit .js-task-form'(e, tpl) {
    e.preventDefault();
    const form = e.target;
    const title = form.title.value.trim();
    const notes = form.notes.value.trim();
    const rawCat = form.category.value;
    let categoryType = rawCat;
    let customCategoryId = null;
    if (rawCat.startsWith('custom:')) {
      categoryType = 'custom';
      customCategoryId = rawCat.slice(7);
    }
    const priority = form.priority.value;
    let dueDate = null;
    if (form.due.value) {
      dueDate = new Date(`${form.due.value}T12:00:00`);
    }
    const editing = tpl.editingId.get();
    try {
      if (editing) {
        updateTask({
          taskId: editing,
          title,
          notes,
          categoryType,
          customCategoryId,
          priority,
          dueDate,
        });
        toastNotify('success', 'Task updated');
        tpl.editorOpen.set(false);
        tpl.editingId.set(null);
      } else {
        insertTask({
          title,
          notes,
          categoryType,
          customCategoryId,
          priority,
          dueDate,
        });
        toastNotify('success', 'Task created');
        tpl.editorOpen.set(false);
        form.reset();
      }
    } catch (err) {
      toastNotify('error', err.reason || err.message || String(err));
    }
  },
  'click .js-close-editor'(e, tpl) {
    tpl.editorOpen.set(false);
    tpl.editingId.set(null);
  },
  'click .js-close-editor-btn'(e, tpl) {
    e.preventDefault();
    tpl.editorOpen.set(false);
    tpl.editingId.set(null);
  },
});

Template.workspacePage.onRendered(function () {
  const tpl = this;
  tpl.sortableInstance = null;
  tpl.autorun(() => {
    tpl.filterSearch.get();
    tpl.filterCategory.get();
    tpl.filterCompletion.get();
    tpl.filterPriority.get();
    getUserId();
    Tasks.find(taskQueryForFilters(tpl), { sort: { sortOrder: 1, createdAt: -1 } }).fetch();
    filtersDefault(tpl);
    Tracker.afterFlush(() => {
      const el = tpl.$('#vtf-sort-list');
      if (!el || !el[0]) {
        if (tpl.sortableInstance) {
          tpl.sortableInstance.destroy();
          tpl.sortableInstance = null;
        }
        return;
      }
      if (!filtersDefault(tpl)) {
        if (tpl.sortableInstance) {
          tpl.sortableInstance.destroy();
          tpl.sortableInstance = null;
        }
        return;
      }
      if (tpl.sortableInstance) tpl.sortableInstance.destroy();
      tpl.sortableInstance = Sortable.create(el[0], {
        animation: 180,
        handle: '.task-drag',
        ghostClass: 'vtf-ghost',
        onEnd() {
          const nodeList = el[0].querySelectorAll('[data-task-id]');
          const orderedIds = Array.from(nodeList).map((n) => n.getAttribute('data-task-id'));
          try {
            reorderTasks(orderedIds);
          } catch (err) {
            toastNotify('error', err.reason || err.message || String(err));
          }
        },
      });
    });
  });
});

Template.workspacePage.onDestroyed(function () {
  if (this.sortableInstance) {
    this.sortableInstance.destroy();
    this.sortableInstance = null;
  }
});
