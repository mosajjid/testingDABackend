const mongoose = require("mongoose");

const nftSchema = mongoose.Schema({
  name: {
    type: String,
    require: true,
  },
  type: {
    type: Number,
    default: 1,
    require: true,
    enum: [1, 2],
  },
  metaDatahash: {
    type: String
  },
  s3JsonURL: {
    type: String
  },
  hash: {
    type: String,
    require: true
  },
  image: { type: String, require: true },
  previewImg: { type: String },
  fileType: { type: String, default: "Image" },
  price: { type: mongoose.Types.Decimal128, require: true },
  description: { type: String },
  collectionID: {
    type: mongoose.Schema.ObjectId,
    ref: "Collection",
  },
  collectionAddress: {
    type: String,
  },
  tokenID: Number,
  attributes: [
    {
      trait_type: {
        type: String,
      },
      value: {
        type: String,
      },
      max_value: {
        type: String,
        default: "",
      },
      isImage: {
        type: String,
      },
    },
  ],
  totalQuantity: Number,
  ownedBy: [
    {
      address: {
        type: String,
        lowercase: true,
      },
      quantity: {
        type: Number,
      },
    },
  ],
  hash: {
    type: String,
  },
  isMinted: {
    type: Number,
    default: 0,
    enum: [0, 1],
  },
  categoryID: {
    type: mongoose.Schema.ObjectId,
    ref: "Category",
  },
  brandID: {
    type: mongoose.Schema.ObjectId,
    ref: "Brand",
  },
  lazyMintingStatus: {
    type: Number,
    default: 0,
    enum: [0, 1, 2],
  },
  quantity_minted: {
    type: Number,
    default: 0,
  },
  user_likes: [
    {
      type: mongoose.Schema.ObjectId,
    },
  ],
  isImported: {
    type: Number,
    default: 0,
    enum: [0, 1], // 0-No 1-Yes
  },
  brandID: {
    type: mongoose.Schema.ObjectId,
    ref: "Brand",
  },
  categoryID: {
    type: mongoose.Schema.ObjectId,
    ref: "Category",
  },
  status: {
    //0 - Inactive & 1 - Active
    type: Number,
    enum: [0, 1],
    default: 1,
  },
  hashStatus: {
    //0 - Inactive & 1 - Active & 2 - Failed/Cancel
    type: Number,
    enum: [0, 1, 2],
    default: 0,
  },
  createdBy: {
    type: mongoose.Schema.ObjectId,
    ref: "User",
  },
  createdOn: {
    type: Date,
    default: Date.now,
  },
  lastUpdatedBy: {
    type: mongoose.Schema.ObjectId,
    ref: "User",
  },
  lastUpdatedOn: {
    type: Date,
    default: Date.now,
  },
});
nftSchema.index({ collectionID: 1, collectionAddress: 1, tokenID: 1 }, { unique: true });
module.exports = mongoose.model("NFT", nftSchema);
