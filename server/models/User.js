import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    remindersEnabled: { type: Boolean, default: true },
    resume: { type: String, default: '', maxlength: 12000 },
  },
  { timestamps: true }
);

export default mongoose.models.User || mongoose.model('User', userSchema);
