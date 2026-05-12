import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { FlowRouter } from 'meteor/ostrio:flow-router-extra';
import './login.html';
import { toastNotify } from '../lib/toast';
import { loginWithPassword } from '../../api/localAuth';

Template.loginPage.events({
  'submit .js-login-form'(e) {
    e.preventDefault();
    const email = e.target.email.value.trim();
    const password = e.target.password.value;
    try {
      loginWithPassword(email, password);
      toastNotify('success', 'Signed in');
      Meteor.defer(() => FlowRouter.go('/app'));
    } catch (err) {
      toastNotify('error', err.reason || err.message || String(err));
    }
  },
});
