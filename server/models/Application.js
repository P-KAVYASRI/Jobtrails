import mongoose from 'mongoose';

export const STATUSES = ['Applied', 'Screening', 'Interview', 'Offer', 'Rejected'];
export const PRIORITIES = ['Low', 'Medium', 'High'];

export const INTERVIEW_TYPES = ['Phone', 'Technical', 'HR', 'Onsite', 'Other'];

const interviewSchema = new mongoose.Schema({
  round: { type: String, default: '' },
  type: { type: String, enum: INTERVIEW_TYPES, default: 'Other' },
  date: { type: Date, default: null },
  interviewer: { type: String, default: '' },
  notes: { type: String, default: '' },
});

const applicationSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    company: { type: String, required: true, trim: true, maxlength: 120 },
    role: { type: String, required: true, trim: true, maxlength: 120 },
    status: { type: String, enum: STATUSES, default: 'Applied' },
    priority: { type: String, enum: PRIORITIES, default: 'Medium' },
    salary: { type: String, default: '' },
    location: { type: String, default: '' },
    link: { type: String, default: '' },
    notes: { type: String, default: '', maxlength: 5000 },
    contactName: { type: String, default: '' },
    contactEmail: { type: String, default: '' },
    appliedDate: { type: Date, default: Date.now },
    followUpDate: { type: Date, default: null },
    tags: { type: [String], default: [] },
    jobDescription: { type: String, default: '', maxlength: 8000 },
    interviews: { type: [interviewSchema], default: [] },
    order: { type: Number, default: 0 }, // position inside its Kanban column
    statusChangedAt: { type: Date, default: Date.now },
    // resume match (computed on save, see server/services/match.js)
    matchScore: { type: Number, default: null },
    matchedSkills: { type: [String], default: [] },
    missingSkills: { type: [String], default: [] },
    // follow-up coach
    lastNudgedAt: { type: Date, default: null },
    nudgeCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

applicationSchema.index({ userId: 1, status: 1, order: 1 });

export default mongoose.models.Application || mongoose.model('Application', applicationSchema);
