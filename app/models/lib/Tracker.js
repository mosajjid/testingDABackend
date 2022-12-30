// const mongoose = require("mongoose");

// const trackerSchema = mongoose.Schema({
//   nftID: {
//     type: mongoose.Schema.ObjectId,
//     ref: "NFT",
//   },
//   bidID: {
//     type: mongoose.Schema.ObjectId,
//     ref: "Bid",
//   },
//   orderID: {
//     type: mongoose.Schema.ObjectId,
//     ref: "Order",
//   },
//   processType: {
//     type: String,
//     enum: [
//       "Cancel",
//       "Reject",
//       "Remove",
//     ],
//   },
//   hash: {
//     type: String,
//     require: true
//   },
//   hashStatus: {
//     type: Number,
//     enum: [0, 1, 2],
//     default: 0,
//   },
//   createdBy: {
//     type: mongoose.Schema.ObjectId,
//     ref: "User",
//   },
//   createdOn: {
//     type: Date,
//     default: Date.now,
//   },
//   lastUpdatedBy: {
//     type: mongoose.Schema.ObjectId,
//     ref: "User",
//   },
//   lastUpdatedOn: {
//     type: Date,
//     default: Date.now,
//   },
// });
// module.exports = mongoose.model("Tracker", trackerSchema);
