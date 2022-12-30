const mongoose = require("mongoose");

const transactionSchema = mongoose.Schema({
  nftID: {
    type: mongoose.Schema.ObjectId,
    ref: "NFT",
  },
  collectionAddress: {
    type: String,
    require: true,
  },
  sellerID: {
    type: mongoose.Schema.ObjectId,
    ref: "User",
  },
  quantity_sold: {
    type: Number,
    default: 0,
  },
  price: {
    type: mongoose.Types.Decimal128,
  },
  tokenID: {
    type: String,
  },
  hash: {
    type: String,
    require: true
  },
  paymentToken: {
    type: String,
  },
  createdBy: {
    type: mongoose.Schema.ObjectId,
    ref: "User",
  },
  createdOn: {
    type: Date,
    default: Date.now,
  }
});
module.exports = mongoose.model("Transaction", transactionSchema);
