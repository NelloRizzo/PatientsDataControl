import mongoose from 'mongoose';
import bcrypt from 'bcrypt';

export interface Address {
  full: string;
  city: string;
  province: string;
  region: string;
  country: string;
  zip?: string;
}

export interface IUserDocument extends mongoose.Document {
  email: string;
  password: string;
  name: string;
  role: 'patient' | 'doctor' | 'analyst' | 'admin';
  unitSystem: 'metric' | 'imperial';
  specialty?: string;
  birthDate?: Date;
  sex?: 'male' | 'female' | 'other';
  homeAddress?: Address;
  legalAddress?: Address;
  emailVerified: boolean;
  verificationToken?: string;
  verificationExpires?: Date;
  maxPatients?: number;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const userSchema = new mongoose.Schema<IUserDocument>(
  {
    email:             { type: String, required: true, unique: true, lowercase: true, trim: true },
    password:          { type: String, required: true, minlength: 8 },
    name:              { type: String, required: true, trim: true },
    role:              { type: String, enum: ['patient','doctor','analyst','admin'], default: 'patient' },
    unitSystem:        { type: String, enum: ['metric','imperial'], default: 'metric' },
    specialty:         { type: String, trim: true },
    birthDate:         Date,
    sex:               { type: String, enum: ['male','female','other'] },
    homeAddress:       { full: String, city: String, province: String, region: String, country: String, zip: String },
    legalAddress:      { full: String, city: String, province: String, region: String, country: String, zip: String },
    emailVerified:     { type: Boolean, default: false },
    verificationToken: { type: String },
    verificationExpires: { type: Date },
    maxPatients:       { type: Number },
  },
  { timestamps: true }
);

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = async function (
  candidatePassword: string
): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

userSchema.set('toJSON', {
  transform: (_doc, ret: any) => {
    delete ret.password;
    delete ret.verificationToken;
    delete ret.verificationExpires;
    return ret;
  },
});

export const User = mongoose.model<IUserDocument>('User', userSchema);
