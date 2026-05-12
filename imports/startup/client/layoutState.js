import { ReactiveDict } from 'meteor/reactive-dict';

export const layoutState = new ReactiveDict();
layoutState.set('page', 'loadingPage');
