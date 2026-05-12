import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { FlowRouter } from 'meteor/ostrio:flow-router-extra';
import './signup.html';
import { toastNotify } from '../lib/toast';
import { createLocalUser } from '../../api/localAuth';

Template.signupPage.events({
  'submit .js-signup-form'(e) {
    e.preventDefault();
    const name = e.target.name.value.trim();
    const email = e.target.email.value.trim();
    const password = e.target.password.value;
    try {
      createLocalUser({
        email,
        password,
        profile: { name },
      });
      toastNotify('success', 'Welcome aboard');
      Meteor.defer(() => FlowRouter.go('/app'));
    } catch (err) {
      toastNotify('error', err.reason || err.message || String(err));
    }
  },
});
