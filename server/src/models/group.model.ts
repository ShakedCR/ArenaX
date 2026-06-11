import { Schema, model, Document, Types } from "mongoose";

export interface IGroup extends Document {
  name: string;
  description?: string;
  owner: Types.ObjectId;
  members: Types.ObjectId[];
  preferredGames: string[];
  isPrivate: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const groupSchema = new Schema<IGroup>(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      default: ""
    },
    owner: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    members: [
      {
        type: Schema.Types.ObjectId,
        ref: "User"
      }
    ],
    preferredGames: {
      type: [String],
      default: []
    },
    isPrivate: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
);

const Group = model<IGroup>("Group", groupSchema);

export default Group;