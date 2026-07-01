import { Schema, model, Document, Types } from "mongoose";

export interface IDocumentChunk extends Document {
  tournament: Types.ObjectId;
  text: string;
  embedding: number[];
  source: string;
  chunkIndex: number;
  createdAt: Date;
}

const documentChunkSchema = new Schema<IDocumentChunk>(
  {
    tournament: {
      type: Schema.Types.ObjectId,
      ref: "Tournament",
      required: true,
      index: true,
    },
    text: {
      type: String,
      required: true,
    },
    embedding: {
      type: [Number],
      required: true,
    },
    source: {
      type: String,
      required: true,
    },
    chunkIndex: {
      type: Number,
      required: true,
    },
  },
  { timestamps: true }
);

const DocumentChunk = model<IDocumentChunk>("DocumentChunk", documentChunkSchema);

export default DocumentChunk;
