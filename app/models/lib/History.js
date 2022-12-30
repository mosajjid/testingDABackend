const mongoose = require("mongoose");

const historySchema = new mongoose.Schema({
  nftID: {
    type: mongoose.Schema.ObjectId,
    ref: "NFT",
  },
  buyerID: {
    type: mongoose.Schema.ObjectId,
    ref: "User",
  },
  sellerID: {
    type: mongoose.Schema.ObjectId,
    ref: "User",
  },
  action: {
    type: String,
    enum: ["PutOnSale", "RemoveFromSale", "Offer", "Sold", "Bid"],
  },
  type: {
    type: String,
    enum: ["List", "Accepted", "Rejected", "Created", "Cancelled", "Updated", "Fixed Sale", "Timed Auction", "Open for Bids", ""],
  },
  paymentToken: {
    type: String,
  },
  price: {
    type: mongoose.Types.Decimal128,
    required: true,
  },
  quantity: {
    type: Number,
  },
  hash: {
    type: String,
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
  byCron: {
    type: Boolean,
    default: false
  }
});

module.exports = mongoose.model("History", historySchema);
