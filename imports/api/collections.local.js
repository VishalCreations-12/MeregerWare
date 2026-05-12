import { Mongo } from 'meteor/mongo';

export const Tasks = new Mongo.Collection('tasks', { connection: null });

export const CustomCategories = new Mongo.Collection('custom_categories', { connection: null });
