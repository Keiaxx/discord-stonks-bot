'use strict';

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const StonkEntry = new Schema({
  dow: {type: Number, default: 0},
  am: {type: Number, default: 0},
  pm: {type: Number, default: 0}
});

const UserSchema = new Schema({
  did: { type: String, default: '' },
  tz: { type: String, default: '' },
  stonks: [StonkEntry],
});

mongoose.model('User', UserSchema);