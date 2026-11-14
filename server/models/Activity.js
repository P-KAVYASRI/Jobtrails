import mongoose from 'mongoose';

const activitySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  applicationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Application', required: true, index: true },
  company: String,
  from: { type: String, default: null },
  to: String,
  at: { type: Date, default: Date.now },
});

export default mongoose.models.Activity || mongoose.model('Activity', activitySchema);
