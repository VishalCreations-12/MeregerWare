import { FlowRouter } from 'meteor/ostrio:flow-router-extra';
import { layoutState } from './layoutState';
import { getUserId } from '../../api/localAuth';

function redirectAuthed(context, redirect) {
  if (getUserId()) {
    redirect('/app');
  }
}

function redirectGuest(context, redirect) {
  if (!getUserId()) {
    redirect('/login');
  }
}

FlowRouter.route('/', {
  name: 'home',
  action() {
    layoutState.set('page', 'loadingPage');
    FlowRouter.redirect(getUserId() ? '/app' : '/login');
  },
});

FlowRouter.route('/login', {
  name: 'login',
  triggersEnter: [redirectAuthed],
  action() {
    layoutState.set('page', 'loginPage');
  },
});

FlowRouter.route('/signup', {
  name: 'signup',
  triggersEnter: [redirectAuthed],
  action() {
    layoutState.set('page', 'signupPage');
  },
});

FlowRouter.route('/app', {
  name: 'app',
  triggersEnter: [redirectGuest],
  action() {
    layoutState.set('page', 'workspacePage');
  },
});

FlowRouter.wait();
