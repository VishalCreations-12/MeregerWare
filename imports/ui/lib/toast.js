import { Meteor } from 'meteor/meteor';
import { ReactiveVar } from 'meteor/reactive-var';

let seq = 0;
const items = new ReactiveVar([]);

export function toastNotify(type, message, ttl = 4200) {
  const id = (++seq).toString();
  const next = [...items.get(), { id, type, message }];
  items.set(next);
  Meteor.setTimeout(() => {
    items.set(items.get().filter((x) => x.id !== id));
  }, ttl);
}

export function toastItemsReactive() {
  return items;
}
