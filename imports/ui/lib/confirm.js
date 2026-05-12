import { ReactiveDict } from 'meteor/reactive-dict';

export const confirmBox = new ReactiveDict();

export function confirmRequest(message, onResult) {
  confirmBox.set('open', true);
  confirmBox.set('message', message);
  confirmBox.set('cb', onResult);
}

export function confirmDismiss(result) {
  const cb = confirmBox.get('cb');
  confirmBox.set('open', false);
  confirmBox.set('message', '');
  confirmBox.set('cb', null);
  if (typeof cb === 'function') cb(result);
}
