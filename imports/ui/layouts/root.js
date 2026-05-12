import { Template } from 'meteor/templating';
import './root.html';
import { layoutState } from '../../startup/client/layoutState';
import { toastItemsReactive, toastNotify } from '../lib/toast';
import { confirmBox, confirmDismiss } from '../lib/confirm';
import { themeMode } from '../lib/theme';

Template.rootLayout.helpers({
  page() {
    return layoutState.get('page');
  },
});

Template.rootLayout.onRendered(function () {
  this.autorun(() => {
    const mode = themeMode.get();
    document.documentElement.dataset.theme = mode;
  });
});

Template.toastStack.helpers({
  toastItems() {
    return toastItemsReactive().get();
  },
});

Template.confirmGate.helpers({
  confirmOpen() {
    return !!confirmBox.get('open');
  },
  confirmMessage() {
    return confirmBox.get('message');
  },
});

Template.confirmGate.events({
  'click .js-confirm-yes'() {
    confirmDismiss(true);
  },
  'click .js-confirm-no'() {
    confirmDismiss(false);
  },
  'click .vtf-confirm-backdrop'(e) {
    if (e.target === e.currentTarget) confirmDismiss(false);
  },
});

window.addEventListener('vtf-toast', (e) => {
  const d = e.detail || {};
  toastNotify(d.type || 'info', d.message || '');
});
