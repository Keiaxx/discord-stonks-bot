'use strict';

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const GuildSchema = new Schema({
  gid: { type: String, default: '' },
  trackedUsers: [
    {type: Schema.Types.ObjectId, ref: 'User'}
  ],
});

mongoose.model('Guild', GuildSchema);