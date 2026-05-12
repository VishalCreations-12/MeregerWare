import '../../ui/styles/app.css';
import '../../ui/layouts/root.js';
import '../../ui/pages/loading.js';
import '../../ui/pages/login.js';
import '../../ui/pages/signup.js';
import '../../ui/pages/workspace.js';
import './routes.js';
import { Meteor } from 'meteor/meteor';
import { Tracker } from 'meteor/tracker';
import { FlowRouter } from 'meteor/ostrio:flow-router-extra';
import { initLocalAuth } from '../../api/localAuth';
import { hydrateLocalDatabase } from '../../api/localPersistence';
import { initThemeDocument } from '../../ui/lib/theme.js';

Meteor.startup(() => {
  initLocalAuth();
  hydrateLocalDatabase();
  initThemeDocument();
  Tracker.afterFlush(() => {
    try {
      FlowRouter.initialize();
    } catch (e) {
      void e;
    }
  });
});
