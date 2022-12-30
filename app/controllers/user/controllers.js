/* eslint-disable no-undef */
const fs = require("fs");
const http = require("https");
const pinataSDK = require("@pinata/sdk");
const ipfsAPI = require("ipfs-api");
const ipfs = ipfsAPI("ipfs.infura.io", "5001", {
  protocol: "https",
  auth: "21w11zfV67PHKlkAEYAZWoj2tsg:f2b73c626c9f1df9f698828420fa8439",
});
const aws = require("aws-sdk");
const multer = require("multer");
const multerS3 = require("multer-s3");
const mongoose = require("mongoose");
const pinata = pinataSDK(
  process.env.PINATAAPIKEY,
  process.env.PINATASECRETAPIKEY
);
const { User, Category, NFT, } = require("../../models");
const _ = require("../../../globals/lib/helper");
const validators = require("../helpers/validators");

const spacesEndpoint = new aws.Endpoint(process.env.BUCKET_ENDPOINT);
const s3 = new aws.S3({
  endpoint: spacesEndpoint,
  accessKeyId: process.env.BUCKET_ACCESS_KEY_ID,
  secretAccessKey: process.env.BUCKET_SECRET_ACCESS_KEY,
});

const storage = multerS3({
  s3: s3,
  bucket: process.env.BUCKET_NAME,
  acl: "public-read",
  contentType: multerS3.AUTO_CONTENT_TYPE,
  key: function (request, file, cb) {
    cb(null, file.originalname);
  },
});

let fileFilter = function (req, file, cb) {
  var allowedMimes = ["image/jpeg", "image/jpg", "image/png", "image/gif"];
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      {
        success: false,
        message:
          "Invalid file type! Only JPG, JPEG , PNG and GIF image files are allowed.",
      },
      false
    );
  }
};
let oMulterObj = {
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 8mb
  },
  fileFilter: fileFilter,
};
const upload = multer(oMulterObj).single("userProfile");
class UserController {
  constructor() {

  }

  async getIndividualUser(req, res) {
    try {
      if (!req.params.userID)
        return res.reply(messages.not_found("User ID"));

      User.findById(req.params.userID, (err, user) => {
        if (err) return res.reply(messages.server_error());
        if (!user) return res.reply(messages.not_found("User"));
        return res.reply(messages.successfully("User Details Found"), user);
      });
    } catch (error) {
      return res.reply(messages.server_error());
    }
  };

  async getUserDetails(req, res) {
    console.log("Fun called");
    try {
      if (!req.params.user)
        return res.reply(messages.not_found("Request"));

      let searchKey = req.params.user;

      User.findOne({ $or: [{ 'fullname': searchKey }, { 'username': searchKey }, { 'walletAddress': searchKey }] }, (err, user) => {
        if (err) return res.reply(messages.server_error());
        if (!user) return res.reply(messages.not_found("User"));
        return res.reply(messages.successfully("User Details Found"), user);
      });
    } catch (error) {
      return res.reply(messages.server_error());
    }
  };

  async getUsers(req, res) {
    try {
      console.log("Called Here");
      console.log("Req ", req.userId);
      if (!req.userId) return res.reply(messages.unauthorized());
      let data = [];
      let searchText = req.body.searchText;
      const page = parseInt(req.body.page);
      const limit = parseInt(req.body.limit);
      const startIndex = (page - 1) * limit;
      const endIndex = page * limit;
      let UserSearchArray = [];

      User.findById(req.userId, async (err, userData) => {
        if (err) return res.reply(messages.server_error());
        if (!userData) return res.reply(messages.not_found("User"));
        if (userData.role == "admin") {

          UserSearchArray["role"] = "user";
          if (searchText !== "") {
            UserSearchArray["$or"] = [
              { 'email': { $regex: new RegExp(searchText), $options: "i" } },
              { 'username': { $regex: new RegExp(searchText), $options: "i" } },
              { 'fullname': { $regex: new RegExp(searchText), $options: "i" } },
              { 'walletAddress': { $regex: new RegExp(searchText), $options: "i" } }
            ];
          }
          let UserSearchObj = Object.assign({}, UserSearchArray);
          const results = {};
          if (endIndex < (await User.countDocuments(UserSearchObj).exec())) {
            results.next = {
              page: page + 1,
              limit: limit,
            };
          }
          if (startIndex > 0) {
            results.previous = {
              page: page - 1,
              limit: limit,
            };
          }
          await User.find(UserSearchObj)
            .sort({ createdOn: -1 })
            .select({
              walletAddress: 1,
              username: 1,
              fullname: 1,
              email: 1,
              profileIcon: 1,
              phoneNo: 1,
              role: 1,
              status: 1,
              bio: 1,
              user_followings: 1,
              user_followers_size: 1,
              createdBy: 1,
              createdOn: 1,
              lastUpdatedBy: 1,
              lastUpdatedOn: 1
            })
            .limit(limit)
            .skip(startIndex)
            .lean()
            .exec()
            .then((res) => {
              data.push(res);
            })
            .catch((e) => {
              console.log("Error", e);
            });

          results.count = await User.countDocuments(UserSearchObj).exec();
          results.results = data;
          res.header("Access-Control-Max-Age", 600);
          return res.reply(messages.success("User List"), results);

        } else if (userData.role == "superadmin") {

          UserSearchArray["_id"] = mongoose.Types.ObjectId(req.userId);;
          if (searchText !== "") {
            UserSearchArray["$or"] = [
              { 'email': { $regex: new RegExp(searchText), $options: "i" } },
              { 'username': { $regex: new RegExp(searchText), $options: "i" } },
              { 'fullname': { $regex: new RegExp(searchText), $options: "i" } },
              { 'walletAddress': { $regex: new RegExp(searchText), $options: "i" } }
            ];
          }
          let UserSearchObj = Object.assign({}, UserSearchArray);
          const results = {};
          if (endIndex < (await User.countDocuments(UserSearchObj).exec())) {
            results.next = {
              page: page + 1,
              limit: limit,
            };
          }
          if (startIndex > 0) {
            results.previous = {
              page: page - 1,
              limit: limit,
            };
          }
          await User.find(UserSearchObj)
            .sort({ createdOn: -1 })
            .select({
              walletAddress: 1,
              username: 1,
              fullname: 1,
              email: 1,
              profileIcon: 1,
              phoneNo: 1,
              role: 1,
              status: 1,
              bio: 1,
              user_followings: 1,
              user_followers_size: 1,
              createdBy: 1,
              createdOn: 1,
              lastUpdatedBy: 1,
              lastUpdatedOn: 1
            })
            .limit(limit)
            .skip(startIndex)
            .lean()
            .exec()
            .then((res) => {
              data.push(res);
            })
            .catch((e) => {
              console.log("Error", e);
            });

          results.count = await User.countDocuments(UserSearchObj).exec();
          results.results = data;
          res.header("Access-Control-Max-Age", 600);
          return res.reply(messages.success("User List"), results);

        } else {
          return res.reply(messages.unauthorized());
        }

      });
    } catch (error) {
      console.log("Error:", error);
      return res.reply(messages.error());
    }
  };

  async getAllUsers(req, res) {
    try {
      let data = [];
      let searchText = req.body.searchText;
      const page = parseInt(req.body.page);
      const limit = parseInt(req.body.limit);
      const startIndex = (page - 1) * limit;
      const endIndex = page * limit;

      let UserSearchArray = [];
      UserSearchArray["role"] = "user";
      if (searchText !== "") {
        UserSearchArray["$or"] = [
          { 'email': { $regex: new RegExp(searchText), $options: "i" } },
          { 'username': { $regex: new RegExp(searchText), $options: "i" } },
          { 'fullname': { $regex: new RegExp(searchText), $options: "i" } },
          { 'walletAddress': { $regex: new RegExp(searchText), $options: "i" } }
        ];
      }
      let UserSearchObj = Object.assign({}, UserSearchArray);
      const results = {};
      if (endIndex < (await User.countDocuments(UserSearchObj).exec())) {
        results.next = {
          page: page + 1,
          limit: limit,
        };
      }
      if (startIndex > 0) {
        results.previous = {
          page: page - 1,
          limit: limit,
        };
      }
      await User.find(UserSearchObj)
        .sort({ createdOn: -1 })
        .select({
          walletAddress: 1,
          username: 1,
          fullname: 1,
          email: 1,
          profileIcon: 1,
          phoneNo: 1,
          role: 1,
          status: 1,
          bio: 1,
          user_followings: 1,
          user_followers_size: 1,
          createdBy: 1,
          createdOn: 1,
          lastUpdatedBy: 1,
          lastUpdatedOn: 1
        })
        .limit(limit)
        .skip(startIndex)
        .lean()
        .exec()
        .then((res) => {
          data.push(res);
        })
        .catch((e) => {
          console.log("Error", e);
        });

      results.count = await User.countDocuments(UserSearchObj).exec();
      results.results = data;
      res.header("Access-Control-Max-Age", 600);
      return res.reply(messages.success("User List"), results);
    } catch (error) {
      console.log("Error:", error);
      return res.reply(messages.error());
    }
  };

  async blockUser(req, res) {
    try {
      if (!req.userId) return res.reply(messages.unauthorized());
      if (!req.body.userID)
        return res.reply(messages.not_found("User ID"));

      User.findById(req.userId, async (err, user) => {
        if (err) return res.reply(messages.server_error());
        if (!user) return res.reply(messages.not_found("User"));
        let userStatus = user.status;
        let UpdateduserStatus = 0;
        let StatusText = "";
        if (userStatus === 1) {
          StatusText = "Blocked";
          UpdateduserStatus = 0;
        } else {
          StatusText = "unBlocked";
          UpdateduserStatus = 1;
        }
        await User.findOneAndUpdate(
          { _id: mongoose.Types.ObjectId(req.body.userID) },
          { status: UpdateduserStatus }
        ).catch((e) => {
          console.log("Error1", e.message);
        });
        return res.reply(messages.successfully("User " + StatusText + " Successfully"), user);
      });
    } catch (error) {
      return res.reply(messages.server_error());
    }
  };

  async profile(req, res) {
    try {
      // if (!req.userId) {
      //     return res.reply(messages.unauthorized());
      // }
      console.log("user profile api is hit");
      console.log("user id is---->", req.userId)
      User.findOne(
        {
          _id: req.userId,
        },
        {
          Name: 1,
          username: 1,
          sCreated: 1,
          email: 1,
          walletAddress: 1,
          profileIcon: 1,
          Website: 1,
          bio: 1,
          user_followings_size: {
            $cond: {
              if: {
                $isArray: "$user_followings",
              },
              then: {
                $size: "$user_followings",
              },
              else: 0,
            },
          },
          user_followers_size: 1,
        },
        (err, user) => {
          if (err) return res.reply(messages.server_error());
          if (!user) return res.reply(messages.not_found("User"));
          return res.reply(messages.no_prefix("User Details"), user);
        }
      );
    } catch (error) {
      return res.reply(messages.server_error());
    }
  };

  async updateProfile(req, res, next) {
    try {
      if (!req.userId) return res.reply(messages.unauthorized());
      let profileDetails = {};
      await upload(req, res, async (error) => {
        if (error) return res.reply(messages.bad_request(error.message));
        await User.findOne(
          {
            username: req.body.username,
          },
          async (err, user) => {
            if (err) return res.reply("Error While checking username");
            if (user)
              if (user._id.toString() !== req.userId.toString()) {
                return res.reply(
                  messages.already_exists(
                    "User with username '" + req.body.username + "'"
                  )
                );
              }
            profileDetails = {
              username: req.body.userName,
              fullname: req.body.fullname,
              bio: req.body.bio,
              email: req.body.email,
            };

            console.log("here--->>");
            const aAllowedMimes = [
              "image/jpeg",
              "image/jpg",
              "image/png",
              "image/gif",
            ];
            if (req.file !== undefined) {
              if (!aAllowedMimes.includes(req.file.mimetype)) {
                return res.reply(messages.invalid("File Type"));
              }

              profileDetails["profileIcon"] = req.file.location;

              console.log("req.file.location", req.file.location);
            }
            await User.findByIdAndUpdate(
              req.userId,
              profileDetails,
              (err, user) => {
                if (err) return res.reply(messages.server_error());
                if (!user) return res.reply(messages.not_found("User"));
                req.session["name"] = req.body.Firstname;
                return res.reply(messages.successfully("User Details Updated"));
              }
            ).catch((e) => {
              return res.reply(messages.error());
            });
          }
        );
      });
    } catch (error) {
      return res.reply(messages.server_error());
    }
  };

  async addCollaborator(req, res) {
    try {
      if (!req.userId) return res.reply(messages.unauthorized());
      if (!req.body) return res.reply(messages.not_found("Collaborator Details"));

      if (!validators.isValidwalletAddress(req.body.sAddress))
        return res.reply(messages.invalid("Collaborator Address"));
      if (
        !validators.isValidString(req.body.sfullname) ||
        !validators.isValidName(req.body.sfullname)
      )
        return res.reply(messages.invalid("Collaborator Name"));

      req.body.sAddress = _.toChecksumAddress(req.body.sAddress);

      User.findById(req.userId, (err, user) => {
        if (err) return res.reply(messages.server_error());
        if (!user) return res.reply(messages.not_found("User"));

        if (user.swalletAddress == req.body.sAddress)
          return res.reply(
            messages.bad_request("You Can't Add Yourself As a Collaborator")
          );

        let aUserCollaborators = user.aCollaborators;
        let bAlreadyExists;
        aUserCollaborators.forEach((oCollaborator) => {
          if (oCollaborator.sAddress == req.body.sAddress) bAlreadyExists = true;
        });

        if (bAlreadyExists)
          return res.reply(messages.already_exists("Collaborator"));

        oCollaboratorDetails = {
          $push: {
            aCollaborators: [req.body],
          },
        };
        User.findByIdAndUpdate(req.userId, oCollaboratorDetails, (err, user) => {
          if (err) return res.reply(messages.server_error());
          if (!user) return res.reply(messages.not_found("User"));

          return res.reply(messages.successfully("Collaborator Added"));
        });
      });
    } catch (error) {
      return res.reply(messages.server_error());
    }
  };

  async collaboratorList(req, res) {
    try {
      // Per page limit
      var nLimit = parseInt(req.body.length);
      // From where to start
      var nOffset = parseInt(req.body.start);

      let oAggregation = [
        {
          $match: {
            $and: [
              {
                _id: {
                  $eq: mongoose.Types.ObjectId(req.userId),
                },
              },
            ],
          },
        },
        {
          $project: {
            totalCollaborators: {
              $cond: [
                {
                  $not: ["$aCollaborators"],
                },
                0,
                {
                  $size: "$aCollaborators",
                },
              ],
            },
            aCollaborators: {
              $cond: [
                {
                  $not: ["$aCollaborators"],
                },
                [],
                {
                  $slice: ["$aCollaborators", nOffset, nLimit],
                },
              ],
            },
          },
        },
      ];

      let aUsers = await User.aggregate(oAggregation);

      let data = aUsers[0].aCollaborators;

      return res.status(200).json({
        message: "Collaborator List Details",
        data: data,
        draw: req.body.draw,
        recordsTotal: aUsers[0].totalCollaborators,
        recordsFiltered: aUsers[0].totalCollaborators,
      });
    } catch (error) {
      return res.reply(messages.server_error());
    }
  };

  async getCollaboratorList(req, res) {
    try {
      User.findById(req.userId, (err, user) => {
        if (err) return res.reply(messages.server_error());
        if (!user) return res.reply(messages.not_found("User"));
        return res.reply(
          messages.successfully("Collaborator Detials"),
          user.aCollaborators
        );
      });
    } catch (error) {
      return res.reply(messages.server_error());
    }
  };

  async addNewsLetteremails(req, res) {
    try {
      if (!req.body.sName || !req.body.email)
        return res.reply(messages.required_field("Name and email "));
      if (_.iemail(req.body.email)) return res.reply(messages.invalid("email"));
      if (_.iusername(req.body.sName))
        return res.reply(messages.invalid("username"));

      const newsLetteremail = new NewsLetteremail({
        sName: req.body.sName,
        email: req.body.email,
      });
      newsLetteremail
        .save()
        .then((result) => {
          return res.reply(messages.success(), {
            Name: req.body.sName,
            email: req.body.email,
          });
        })
        .catch((error) => {
          if (error.code == 11000)
            return res.reply(messages.already_exists("email"));
          return res.reply(messages.error());
        });
    } catch (err) {
      return res.reply(messages.server_error());
    }
  };

  async deleteCollaborator(req, res) {
    log.green(req.params.collaboratorAddress);
    try {
      if (!req.userId) return res.reply(messages.unauthorized());
      if (!req.params.collaboratorAddress)
        return res.reply(messages.not_found("Collaborator Address"));

      if (!validators.isValidwalletAddress(req.params.collaboratorAddress))
        return res.reply(messages.invalid("Collaborator Address"));

      User.findById(req.userId, (err, user) => {
        if (err) return res.reply(messages.server_error());
        if (!user) return res.reply(messages.not_found("User"));

        let aUserCollaborators = user.aCollaborators;

        aUserCollaborators.forEach((oCollaborator, index) => {
          if (oCollaborator.sAddress == req.params.collaboratorAddress) {
            aUserCollaborators[index] =
              aUserCollaborators[aUserCollaborators.length - 1];
            aUserCollaborators.pop();
            return;
          }
        });

        user.aCollaborators = aUserCollaborators;

        User.findByIdAndUpdate(req.userId, user, (err, user) => {
          if (err) return res.reply(messages.server_error());
          if (!user) return res.reply(messages.not_found("User"));

          return res.reply(messages.successfully("Collaborator Deleted"));
        });
      });
    } catch (error) {
      return res.reply(messages.server_error());
    }
  };

  async getCollaboratorName(req, res) {
    log.green(req.params.collaboratorAddress);
    try {
      if (!req.userId) return res.reply(messages.unauthorized());
      if (!req.params.collaboratorAddress)
        return res.reply(messages.not_found("Collaborator Address"));

      if (!validators.isValidwalletAddress(req.params.collaboratorAddress))
        return res.reply(messages.invalid("Collaborator Address"));

      User.findById(req.userId, (err, user) => {
        if (err) return res.reply(messages.server_error());
        if (!user) return res.reply(messages.not_found("User"));

        let aUserCollaborators = user.aCollaborators;

        if (!aUserCollaborators[0])
          return res.reply(messages.not_found("Collaborator"));

        let oCollaborator;

        aUserCollaborators.forEach((collaborator) => {
          if (collaborator.sAddress == req.params.collaboratorAddress) {
            oCollaborator = collaborator;
            return;
          }
        });

        return res.reply(messages.successfully("Details Found"), oCollaborator);
      });
    } catch (error) {
      return res.reply(messages.server_error());
    }
  };

  async editCollaborator(req, res) {
    try {
      if (!req.userId) return res.reply(messages.unauthorized());
      if (!req.body) return res.reply(messages.not_found("Collaborator Details"));

      if (!validators.isValidwalletAddress(req.body.sAddress))
        return res.reply(messages.invalid("Collaborator Address"));
      if (!validators.isValidwalletAddress(req.body.sPreviousAddress))
        return res.reply(messages.invalid("Previous Address"));
      if (
        !validators.isValidString(req.body.sfullname) ||
        !validators.isValidName(req.body.sfullname)
      )
        return res.reply(messages.invalid("Collaborator Name"));

      req.body.sAddress = _.toChecksumAddress(req.body.sAddress);

      let aUsers = await User.find({
        swalletAddress: req.body.sAddress,
      });

      if (!aUsers.length)
        return res.reply(
          messages.bad_request("User with the given address is not registered")
        );

      User.findById(req.userId, (err, user) => {
        if (err) return res.reply(messages.server_error());
        if (!user) return res.reply(messages.not_found("User"));

        if (user.swalletAddress == req.body.sAddress)
          return res.reply(
            messages.bad_request("You Can't Add Yourself As a Collaborator")
          );

        let aUserCollaborators = user.aCollaborators;
        aUserCollaborators.forEach((oCollaborator, index) => {
          if (oCollaborator.sAddress == req.body.sPreviousAddress) {
            aUserCollaborators[index].sfullname = req.body.sfullname;
            aUserCollaborators[index].sAddress = req.body.sAddress;
            return;
          }
        });
        user.aCollaborators = aUserCollaborators;
        User.findByIdAndUpdate(req.userId, user, (err, user) => {
          if (err) return res.reply(messages.server_error());
          if (!user) return res.reply(messages.not_found("User"));

          return res.reply(messages.successfully("Collaborator Updated"));
        });
      });
    } catch (error) {
      return res.reply(messages.server_error());
    }
  };

  async getCategories(req, res) {
    try {
      const aCategories = await Category.find(
        {
          sStatus: {
            $ne: "Deactivated",
          },
        },
        {
          _id: 0,
          sName: 1,
        }
      ).sort({
        sName: 1,
      });

      return res.reply(messages.success(), {
        aCategories,
      });
    } catch (error) {
      log.red(error);
      return res.reply(messages.server_error());
    }
  };

  async getAboutusData(req, res) {
    try {
      const aAboutus = await Aboutus.findOne(
        {},
        {
          _id: 0,
        }
      ).sort({
        _id: -1,
      });
      return res.reply(messages.success(), {
        aAboutus,
      });
    } catch (error) {
      log.red(error);
      return res.reply(messages.server_error());
    }
  };

  async getFAQsData(req, res) {
    try {
      const aFAQs = await FAQs.find(
        {},
        {
          _id: 0,
        }
      );
      return res.reply(messages.success(), aFAQs);
    } catch (error) {
      log.red(error);
      return res.reply(messages.server_error());
    }
  };

  async getTermsData(req, res) {
    try {
      const aTerms = await Terms.findOne(
        {},
        {
          _id: 0,
        }
      ).sort({
        _id: -1,
      });
      return res.reply(messages.success(), {
        aTerms,
      });
    } catch (error) {
      log.red(error);
      return res.reply(messages.server_error());
    }
  };

  async getUserProfilewithNfts(req, res) {
    console.log("req", req.body);
    try {
      if (!req.body.userId) {
        return res.reply(messages.unauthorized());
      }
      User.findOne(
        {
          _id: req.body.userId,
        },
        {
          Name: 1,
          username: 1,
          sCreated: 1,
          email: 1,
          swalletAddress: 1,
          profileIcon: 1,
          Website: 1,
          bio: 1,
          user_followings: req.body.currUserId
            ? {
              $filter: {
                input: "$user_followings",
                as: "user_followings",
                cond: {
                  $eq: [
                    "$$user_followings",
                    mongoose.Types.ObjectId(req.body.currUserId),
                  ],
                },
              },
            }
            : [],
          user_followings_size: {
            $cond: {
              if: {
                $isArray: "$user_followings",
              },
              then: {
                $size: "$user_followings",
              },
              else: 0,
            },
          },
          user_followers_size: 1,
        },
        (err, user) => {
          if (err) return res.reply(messages.server_error());
          if (!user) return res.reply(messages.not_found("User"));

          return res.reply(messages.no_prefix("User Details"), user);
        }
      );
    } catch (error) {
      log.red(error);
      return res.reply(messages.server_error());
    }
  };

  async getUserWithNfts(req, res) {
    try {
      if (!req.body.userId) return res.reply(messages.unauthorized());

      var nLimit = parseInt(req.body.length);
      var nOffset = parseInt(req.body.start);
      let oSortingOrder = {};
      log.red(req.body);

      if (req.body.sSortingType == "Recently Added") {
        oSortingOrder["sCreated"] = -1;
      } else if (req.body.sSortingType == "Most Viewed") {
        oSortingOrder["nView"] = -1;
      } else if (req.body.sSortingType == "Price Low to High") {
        oSortingOrder["nBasePrice"] = 1;
      } else if (req.body.sSortingType == "Price High to Low") {
        oSortingOrder["nBasePrice"] = -1;
      } else {
        oSortingOrder["_id"] = -1;
      }
      console.log("-----------------------------------------------2");

      let data = await NFT.aggregate([
        {
          $match: {
            $and: [
              {
                $or: [
                  {
                    oCurrentOwner: mongoose.Types.ObjectId(req.body.userId),
                  },
                ],
              },
            ],
          },
        },
        {
          $sort: oSortingOrder,
        },
        {
          $project: {
            _id: 1,
            sName: 1,
            eType: 1,
            nBasePrice: 1,
            sHash: 1,
            nQuantity: 1,
            nTokenID: 1,
            oCurrentOwner: 1,
            sTransactionStatus: 1,
            sGenre: 1,
            sBpm: 1,
            skey_equalTo: 1,
            skey_harmonicTo: 1,
            track_cover: 1,
            eAuctionType: 1,
            user_likes: {
              $size: {
                $filter: {
                  input: "$user_likes",
                  as: "user_likes",
                  cond: {
                    $eq: ["$$user_likes", mongoose.Types.ObjectId(req.userId)],
                  },
                },
              },
            },
            user_likes_size: {
              $cond: {
                if: {
                  $isArray: "$user_likes",
                },
                then: {
                  $size: "$user_likes",
                },
                else: 0,
              },
            },
          },
        },
        {
          $project: {
            _id: 1,
            sName: 1,
            eType: 1,
            nBasePrice: 1,
            sHash: 1,
            nQuantity: 1,
            nTokenID: 1,
            oCurrentOwner: 1,
            sTransactionStatus: 1,
            sGenre: 1,
            sBpm: 1,
            skey_equalTo: 1,
            skey_harmonicTo: 1,
            track_cover: 1,
            eAuctionType: 1,
            is_user_like: {
              $cond: {
                if: {
                  $gte: ["$user_likes", 1],
                },
                then: "true",
                else: "false",
              },
            },
            user_likes_size: 1,
          },
        },
        {
          $lookup: {
            from: "users",
            localField: "oCurrentOwner",
            foreignField: "_id",
            as: "oUser",
          },
        },
        { $unwind: "$oUser" },
        {
          $facet: {
            nfts: [
              {
                $skip: +nOffset,
              },
              {
                $limit: +nLimit,
              },
            ],
            totalCount: [
              {
                $count: "count",
              },
            ],
          },
        },
      ]);

      console.log("-----------------------------------------------2");
      let iFiltered = data[0].nfts.length;
      if (data[0].totalCount[0] == undefined) {
        return res.reply(messages.success("Data"), {
          data: 0,
          draw: req.body.draw,
          recordsTotal: 0,
          recordsFiltered: iFiltered,
        });
      } else {
        return res.reply(messages.no_prefix("NFT Details"), {
          data: data[0].nfts,
          draw: req.body.draw,
          recordsTotal: data[0].totalCount[0].count,
          recordsFiltered: iFiltered,
        });
      }
    } catch (error) {
      log.red(error);
      return res.reply(messages.server_error());
    }
  };

  async getAllUserDetails(req, res) {
    try {
      let data = [];
      const page = parseInt(req.body.page);
      const limit = parseInt(req.body.limit);
      const startIndex = (page - 1) * limit;
      const endIndex = page * limit;
      let searchText = req.body.searchText;

      let UserSearchArray = [];
      if (req.userId) {
        UserSearchArray["_id"] = { $ne: mongoose.Types.ObjectId(req.userId) };
      }

      let UserSearchObj = Object.assign({}, UserSearchArray);
      console.log(UserSearchObj);
      let totalCount = 0;
      if (searchText === "") {
        totalCount = await User.countDocuments(UserSearchObj).exec()
      } else {
        totalCount = await User.countDocuments({
          '_id': { $ne: mongoose.Types.ObjectId(req.userId) },
          $or: [
            {
              "$expr": {
                "$regexMatch": {
                  "input": { "$concat": ["$Name.Firstname", " ", "$Name.Lastname"] },
                  "regex": new RegExp(searchText),  //Your text search here
                  "options": "i"
                }
              }
            },
            { 'username': { $regex: new RegExp(searchText), $options: "i" } },
            { 'swalletAddress': { $regex: new RegExp(searchText), $options: "i" } }
          ]
        }).exec()
      }

      const results = {};
      if (endIndex < totalCount) {
        results.next = {
          page: page + 1,
          limit: limit,
        };
      }
      if (startIndex > 0) {
        results.previous = {
          page: page - 1,
          limit: limit,
        };
      }
      if (searchText !== "") {
        await User.find(UserSearchObj)
          .find({
            $or: [
              {
                "$expr": {
                  "$regexMatch": {
                    "input": { "$concat": ["$Name.Firstname", " ", "$Name.Lastname"] },
                    "regex": new RegExp(searchText),  //Your text search here
                    "options": "i"
                  }
                }
              },
              { 'username': { $regex: new RegExp(searchText), $options: "i" } },
              { 'swalletAddress': { $regex: new RegExp(searchText), $options: "i" } }
            ]
          })
          .sort({ sCreated: -1 })
          .select({
            swalletAddress: 1,
            username: 1,
            email: 1,
            Name: 1,
            srole: 1,
            sCreated: 1,
            sStatus: 1,
            sHash: 1,
            bio: 1,
            Website: 1,
            profileIcon: 1,
            aCollaborators: 1,
            sResetPasswordToken: 1,
            sResetPasswordExpires: 1,
            is_user_following: "false",
            user_followings: 1
          })
          .limit(limit)
          .skip(startIndex)
          .lean()
          .exec()
          .then((res) => {
            data.push(res);
          })
          .catch((e) => {
            console.log("Error", e);
          });

      } else {

        await User.find(UserSearchObj)
          .sort({ sCreated: -1 })
          .select({
            swalletAddress: 1,
            username: 1,
            email: 1,
            Name: 1,
            srole: 1,
            sCreated: 1,
            sStatus: 1,
            sHash: 1,
            bio: 1,
            Website: 1,
            profileIcon: 1,
            aCollaborators: 1,
            sResetPasswordToken: 1,
            sResetPasswordExpires: 1,
            is_user_following: "false",
            user_followings: 1
          })
          .limit(limit)
          .skip(startIndex)
          .lean()
          .exec()
          .then((res) => {
            data.push(res);
          })
          .catch((e) => {
            console.log("Error", e);
          });
      }

      results.count = totalCount;
      results.results = data;
      res.header('Access-Control-Max-Age', 600);
      return res.reply(messages.success("Author List"), results);
    } catch (error) {
      log.red(error);
      return res.reply(messages.server_error());
    }
  };

  async followUser(req, res) {
    try {
      if (!req.userId) return res.reply(messages.unauthorized());

      let { id } = req.body;

      return User.findOne({ _id: mongoose.Types.ObjectId(id) }).then(
        async (userData) => {
          if (userData && userData != null) {
            let followMAINarray = [];
            followMAINarray = userData.user_followings;

            let flag = "";

            let followARY =
              userData.user_followings && userData.user_followings.length
                ? userData.user_followings.filter(
                  (v) => v.toString() == req.userId.toString()
                )
                : [];
            let CurrUser = User.findOne({
              _id: mongoose.Types.ObjectId(req.userId),
            });
            let followerSize = CurrUser.user_followers_size;

            console.log("followerSize", followerSize);

            let newFollowerSize = 0;
            if (followARY && followARY.length) {
              flag = "dislike";
              var index = followMAINarray.indexOf(followARY[0]);
              if (index != -1) {
                followMAINarray.splice(index, 1);
                newFollowerSize -= 1;
              }
            } else {
              flag = "like";
              followMAINarray.push(mongoose.Types.ObjectId(req.userId));
              newFollowerSize += 1;
            }

            await User.findByIdAndUpdate(
              { _id: mongoose.Types.ObjectId(req.userId) },
              { $set: { user_followers_size: newFollowerSize } }
            );

            await User.findByIdAndUpdate(
              { _id: mongoose.Types.ObjectId(id) },
              { $set: { user_followings: followMAINarray } }
            ).then((user) => {
              // if (err) return res.reply(messages.server_error());
              if (flag == "like") {
                return res.reply(messages.successfully("User followed"));
              } else {
                return res.reply(messages.successfully("User unfollowed"));
              }
            });
          } else {
            return res.reply(messages.bad_request("User not found."));
          }
        }
      );
    } catch (error) {
      log.red(error);
      return res.reply(messages.server_error());
    }
  };


  async checkIfBlocked(req, res) {
    try {
      let user = await User.findOne({
        walletAddress: req.body.walletAddress,
        status: 0
      }).exec();
      console.log("user", user)
      if (user !== undefined && user != "" && user !== null) {
        return res.reply(messages.successfully("Result"), true);
      }
      else {
        return res.reply(messages.successfully("Result"), false);
      }
    } catch (error) {
      return res.reply(messages.server_error());
    }
  }
}
module.exports = UserController;