import { Schema, model } from "mongoose";
import bcrypt from "bcryptjs";

const adminSchema = new Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, match: /.+\@.+\..+/ },
  password: { type: String, required: true, minlength: 6 },
  updated_at: { type: Date, default: Date.now },
});

adminSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  try {
    this.password = await bcrypt.hash(this.password, 8);
    next();
  } catch (err) {
    next(err);
  }
});

adminSchema.pre("save", function (next) {
  this.updated_at = Date.now();
  next();
});

adminSchema.set("toJSON", {
  transform: (_doc, ret) => {
    delete ret.password;
    return ret;
  },
});

const Admin = model("Admin", adminSchema);
export default Admin;
