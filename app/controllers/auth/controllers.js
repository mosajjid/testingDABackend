const { User, Whitelist } = require("../../models");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const saltRounds = 10;
const crypto = require("crypto");
const { nodemailer, sendgrid } = require("../../utils");
const validators = require("../helpers/validators");
const pinataSDK = require("@pinata/sdk");
const aws = require("aws-sdk");
const multer = require("multer");
const multerS3 = require("multer-s3");
const pinata = pinataSDK(
  process.env.PINATAAPIKEY,
  process.env.PINATASECRETAPIKEY
);
let signJWT = function (user) {
  return jwt.sign(
    {
      id: user._id,
      role: user.role,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: "1d",
    }
  );
};

// Set S3 endpoint to DigitalOcean Spaces
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

var allowedMimes;
var errAllowed;

let fileFilter = function (req, file, cb) {
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      {
        success: false,
        message: `Invalid file type! Only ${errAllowed}  files are allowed.`,
      },
      false
    );
  }
};

let oMulterObj = {
  storage: storage,
  limits: {
    fileSize: 15 * 1024 * 1024, // 15mb
  },
  fileFilter: fileFilter,
};
const AdminProfileIcon = multer(oMulterObj).single("profileImg");

const uploadBanner = multer(oMulterObj);

class AuthController {
  constructor() { }

  register(req, res) {
    try {
      if (!req.body.walletAddress) {
        return res.reply(messages.required_field("Wallet Address"));
      }
      bcrypt.hash(
        req.body.walletAddress?.toLowerCase(),
        saltRounds,
        (err, hash) => {
          if (err) {
            return res.reply(messages.error());
          }
          if (!req.body.walletAddress?.toLowerCase()) {
            return res.reply(messages.required_field("Wallet Address"));
          }
          const user = new User({
            walletAddress: _.toChecksumAddress(
              req.body.walletAddress?.toLowerCase()
            ),
          });
          console.log("Wallet " + req.body.walletAddress?.toLowerCase());
          user
            .save()
            .then((result) => {
              let token = signJWT(user);
              req.session["_id"] = user._id;
              req.session["walletAddress"] = user.walletAddress?.toLowerCase();
              return res.reply(messages.created("User"), {
                auth: true,
                token,
                walletAddress: user.walletAddress?.toLowerCase(),
              });
            })
            .catch((error) => {
              return res.reply(messages.already_exists("User"));
            });
        }
      );
    } catch (error) {
      return res.reply(messages.server_error());
    }
  }


  login(req, res) {
    try {
      if (!req.body.walletAddress)
        return res.reply(messages.required_field("Wallet Address"));

      if (!req.body.signature) {
        return res.reply(messages.required_field('Signature'));
      }
      if (!validators.isValidSignature(req.body)) {
        return res.reply(messages.invalid('Data'));
      }
      User.findOne(
        {
          walletAddress: _.toChecksumAddress(req.body.walletAddress),
        },
        (err, user) => {
          if (err) return res.reply(messages.error());
          if (!user) return res.reply(messages.not_found("User"));

          if (user && user.role != "superadmin") {
            var token = signJWT(user);

            req.session["_id"] = user._id;
            req.session["walletAddress"] = user.walletAddress;
            req.session["username"] = user.username;
            return res.reply(messages.successfully("User Logged In"), {
              auth: true,
              token,
              walletAddress: user.walletAddress,
              userId: user._id,
              userType: user.role,
              userData: user,
            });
          } else {
            return res.reply(messages.invalid("Login"));
          }
        }
      );
    } catch (error) {
      return res.reply(messages.server_error());
    }
  }

  logout(req, res, next) {
    try {
      if (!req.userId) return res.reply(messages.unauthorized());
      User.findOne(
        {
          _id: req.userId,
        },
        (err, user) => {
          req.session.destroy();
          if (err) return res.reply(messages.server_error());
          if (!user) return res.reply(messages.not_found("User"));
          return res.reply(messages.successfully("Logout"), {
            auth: false,
            token: null,
          });
        }
      );
    } catch (error) {
      return res.reply(messages.server_error());
    }
  }

  checkIfAuthorized(req, res) {
    if (req.userId) {
      res.reply(messages.success(""), true)
    }
    res.reply(messages.success(""), false)
  }

  async adminregister(req, res) {
    try {
      if (!req.body.walletAddress)
        return res.reply(messages.required_field("Wallet Address"));
      bcrypt.hash(req.body.walletAddress, saltRounds, (err, hash) => {
        if (err) return res.reply(messages.error());
        if (!req.body.walletAddress)
          return res.reply(messages.required_field("Wallet Address"));

        const user = new User({
          walletAddress: _.toChecksumAddress(req.body.walletAddress),
          role: "admin",
        });
        console.log("Wallet " + req.body.walletAddress);
        user
          .save()
          .then((result) => {
            let token = signJWT(user);
            req.session["_id"] = user._id;
            req.session["walletAddress"] = user.walletAddress;
            return res.reply(messages.created("User"), {
              auth: true,
              token,
              walletAddress: user.walletAddress,
            });
          })
          .catch((error) => {
            return res.reply(messages.already_exists("User"));
          });
      });
    } catch (error) {
      return res.reply(messages.server_error());
    }
  }

  adminlogin(req, res) {
    try {
      if (!req.body.walletAddress)
        return res.reply(messages.required_field("Wallet Address"));

      if (!req.body.signature) {
        return res.reply(messages.required_field('Signature'));
      }
      if (!validators.isValidSignature(req.body)) {
        return res.reply(messages.invalid('Data'));
      }
      User.findOne(
        {
          walletAddress: _.toChecksumAddress(req.body.walletAddress),
          role: "admin",
        },
        (err, user) => {
          if (err) return res.reply(messages.error());
          if (!user) return res.reply(messages.not_found("User"));

          if (user && user.status == 1) {
            var token = signJWT(user);
            req.session["_id"] = user._id;
            req.session["walletAddress"] = user.walletAddress;
            req.session["username"] = user.username;
            return res.reply(messages.successfully("User Logged In"), {
              auth: true,
              token,
              walletAddress: user.walletAddress,
              userId: user._id,
              userType: user.role,
              userData: user,
            });
          } else {
            return res.reply(messages.blocked("Admin Account is"));
          }
        }
      );
    } catch (error) {
      return res.reply(messages.server_error());
    }
  }

  async changePassword(req, res, next) {
    try {
      if (!req.userId) return res.reply(messages.unauthorized());
      if (!req.body.password)
        return res.reply(messages.required_field("Password"));

      const loggedInUser = req.userId;
      const salt = await bcrypt.genSalt(10);
      let encryptPassword = await bcrypt.hash(req.body.password, salt);

      User.findOne(
        { _id: mongoose.Types.ObjectId(loggedInUser) },
        (err, user) => {
          if (err) return res.reply(messages.error());
          if (!user) return res.reply(messages.not_found("User"));
          if (user.role !== "user") {
            User.findOneAndUpdate(
              { _id: mongoose.Types.ObjectId(loggedInUser) },
              {
                $set: {
                  password: encryptPassword,
                },
              },
              {
                upsert: true,
              }
            )
              .then((doc) => {
                return res.reply(messages.updated("Password"));
              })
              .catch((err) => {
                return res.reply(messages.server_error());
              });
          } else {
            return res.reply(messages.unauthorized());
          }
        }
      );
    } catch (error) {
      return res.reply(messages.server_error());
    }
  }

  checkuseraddress(req, res) {
    try {
      console.log("here1------------", req.body);
      if (!req.body.walletAddress)
        return res.reply(messages.required_field("Wallet Address"));
      if (!validators.isValidWalletAddress(req.body.walletAddress))
        return res.reply(messages.invalid("Wallet Address"));
      console.log("here2------------",);
      User.findOne(
        {
          walletAddress: _.toChecksumAddress(
            req.body.walletAddress?.toLowerCase()
          ),
        },
        (err, user) => {
          if (err) return res.reply(messages.error());
          if (!user)
            return res.reply(messages.not_found("User"), {
              user: true,
            });
          return res.reply(messages.successfully("User Found"), {
            user: true,
            status: user.status,
          });
        }
      );
      console.log("here3------------");
    } catch (error) {
      return res.reply(error);
    }
  }

  passwordReset(req, res, next) {
    try {
      log.red(req.body);
      if (!req.body.email)
        return res.reply(messages.required_field("Email ID"));
      if (_.iemail(req.body.email))
        return res.reply(messages.invalid("Email ID"));

      var randomHash = "";
      crypto.randomBytes(20, function (err, buf) {
        randomHash = buf.toString("hex");
      });

      User.findOne(
        {
          email: req.body.email,
        },
        (err, user) => {
          if (err) return res.reply(messages.error());
          if (!user) return res.reply(messages.not_found("User"));

          User.findOneAndUpdate(
            {
              email: user.email,
            },
            {
              $set: {
                resetPasswordToken: randomHash,
                resetPasswordExpires: Date.now() + 600,
              },
            },
            {
              upsert: true,
            }
          )
            .then((doc) => { })
            .catch((err) => { });
          nodemailer.send(
            "forgot_password_mail.html",
            {
              SITE_NAME: "DecryptMarketplace",
              USERNAME: user.username,
              ACTIVELINK: `${process.env.BASE_URL}:${process.env.PORT}/api/v1/auth/reset/${randomHash}`,
            },
            {
              from: process.env.SMTP_USERNAME,
              to: user.email,
              subject: "Forgot Password",
            }
          );
          return res.reply(messages.successfully("Email Sent"));
        }
      );
    } catch (error) {
      return res.reply(messages.server_error());
    }
  }

  passwordResetGet(req, res, next) {
    try {
      if (!req.params.token) return res.reply(messages.not_found("Token"));

      User.findOne(
        {
          resetPasswordToken: req.params.token,
        },
        function (err, user) {
          if (!user) {
            return res.render("error/token_expire");
          }
          return res.render("Admin/resetPassword");
        }
      );
    } catch (error) {
      return res.reply(messages.server_error());
    }
  }

  passwordResetPost(req, res, next) {
    try {
      if (!req.params.token) return res.reply(messages.not_found("Token"));
      if (!req.body.password) return res.reply(messages.not_found("Password"));
      if (!req.body.confirmPassword)
        return res.reply(messages.not_found("Confirm Password"));

      if (_.ipassword(req.body.password))
        return res.reply(messages.invalid("Password"));
      if (_.ipassword(req.body.confirmPassword))
        return res.reply(messages.invalid("Password"));

      User.findOne(
        {
          resetPasswordToken: req.params.token,
        },
        function (err, user) {
          if (!user) return res.render("error/token_expire");
          if (req.body.confirmPassword !== req.body.password)
            return res.reply(messages.bad_request("Password not matched"));

          bcrypt.hash(req.body.confirmPassword, saltRounds, (err, hash) => {
            if (err) return res.reply(messages.error());

            user.hash = hash;
            user.resetPasswordToken = undefined;
            user.resetPasswordExpires = undefined;

            user.save((err) => {
              if (err) return res.reply(messages.error());
              return res.reply(messages.updated("Password"));
            });
          });
        }
      );
    } catch (error) {
      return res.reply(messages.server_error());
    }
  }

  async superAdminRegister(req, res) {
    const user = new User({
      fullname: "DA Super Admin",
      email: "shivam.decrypt@gmail.com",
      username: "superadmin",
      walletAddress: "00000000000000000000000000000000000000",
      password: "sadmin@2022",
      satus: 1,
      role: "superadmin",
    });
    user
      .save()
      .then((result) => {
        let token = signJWT(user);
        return res.reply(messages.created("User"), {
          auth: true,
          token,
          userData: user,
        });
      })
      .catch((error) => {
        console.log("Error" + error);
        return res.reply(messages.already_exists("User"));
      });
  }

  async superAdminLogin(req, res, next) {
    try {
      if (!req.body.username)
        return res.reply(messages.required_field("Username"));
      if (!req.body.password)
        return res.reply(messages.required_field("Password"));
      let username = req.body.username;
      let password = req.body.password;
      User.findOne(
        {
          $or: [{ username: username }, { email: username }],
          role: "superadmin",
        },
        (err, user) => {
          if (err) console.log(err);
          if (!user) {
            return res.reply(messages.wrong_credentials(""));
          } else {
            console.log(user);
            user.comparePassword(password, function (err, isMatch) {
              if (err) throw err;
              if (isMatch) {
                if (user.status == 0) {
                  return res.reply(messages.blocked("User"));
                } else {
                  var token = signJWT(user);
                  req.session["_id"] = user._id;
                  req.session["username"] = user.username;
                  res.cookie('admin_auth_token', token, {
                    expires: new Date(Date.now() + (3600 * 1000 * 24 * 1 * 1)), //second min hour days year
                    secure: true, // set to true if your using https or samesite is none
                    httpOnly: true, // backend only
                    sameSite: 'none' // set to none for cross-request
                  });
                  console.log("Hiii");
                  return res.reply(
                    messages.successfully("Super Admin Logged In"),
                    {
                      auth: true,
                      token,
                      walletAddress: user.walletAddress,
                      userId: user._id,
                      userType: user.role,
                      userData: user,
                    }
                  );
                }
              } else {
                return res.reply(messages.wrong_credentials(""));
              }
            });
          }
        }
      );
    } catch (error) {
      console.log(error);
      return res.reply(messages.server_error());
    }
  }

  async addAdmin(req, res) {
    try {
      if (!req.userId) return res.reply(messages.unauthorized());
      allowedMimes = ["image/jpeg", "image/jpg", "image/png", "image/gif"];
      errAllowed = "JPG, JPEG, PNG,GIF";

      uploadBanner.fields([{ name: "profileIcon", maxCount: 1 }])(
        req,
        res,
        async function (error) {
          if (error) {
            return res.reply(messages.bad_request(error.message));
          } else {
            log.green(req.files.profileIcon[0].location);
            if (!req.body.fullname) {
              return res.reply(messages.not_found("User Fullname"));
            }
            if (!req.body.walletAddress) {
              return res.reply(messages.not_found("User Wallet Address"));
            }
            let searchArray = [];
            searchArray["or"] = [
              {
                walletAddress: {
                  $regex: new RegExp(req.body.walletAddress),
                  $options: "i",
                },
              },
              {
                username: {
                  $regex: new RegExp(req.body.walletAddress),
                  $options: "i",
                },
              },
            ];
            let searchObj = Object.assign({}, searchArray);
            const checkUser = await User.countDocuments(searchObj).exec();
            if (checkUser == 0) {
              const user = new User({
                walletAddress: _.toChecksumAddress(req.body.walletAddress),
                // username: _.toChecksumAddress(req.body.walletAddress),
                fullname: req.body.fullname,
                profileIcon: req.files.profileIcon[0].location,
                role: "admin",
              });
              user
                .save()
                .then((result) => {
                  let token = signJWT(user);
                  req.session["_id"] = user._id;
                  req.session["walletAddress"] = user.walletAddress;
                  return res.reply(messages.created("User"), {
                    auth: true,
                    token,
                    walletAddress: user.walletAddress,
                  });
                })
                .catch((error) => {
                  return res.reply(messages.already_exists("User"), error);
                });
            } else {
              return res.reply(messages.already_exists("User"), error);
            }
          }
        }
      );
    } catch (error) {
      return res.reply(messages.server_error());
    }
  }

  async allAdmin(req, res) {
    try {
      const results = {};
      console.log("Called", req.body);
      const page = parseInt(req.body.page);
      const limit = parseInt(req.body.limit);
      const startIndex = (page - 1) * limit;
      console.log("Called", startIndex);
      let searchText = "";
      if (req.body.searchText && req.body.searchText !== undefined) {
        searchText = req.body.searchText;
      }

      let searchArray = [];
      searchArray["role"] = "admin";
      if (searchText !== "") {
        searchArray["or"] = [
          { walletAddress: { $regex: new RegExp(searchText), $options: "i" } },
          { fullname: { $regex: new RegExp(searchText), $options: "i" } },
        ];
      }
      let searchObj = Object.assign({}, searchArray);
      let users = await User.aggregate([
        { $match: searchObj },
        { $skip: startIndex },
        { $limit: limit },
        { $sort: { createdOn: -1 } },
      ]).exec(async function (e, userData) {
        console.log("Error ", e);
        results.count = await User.countDocuments(searchObj).exec();
        results.results = userData;
        return res.reply(messages.success("Admin List"), results);
      });
    } catch (error) {
      console.log("Error " + error);
      return res.reply(messages.server_error());
    }
  }

  async updateAdmin(req, res) {
    try {
      if (!req.userId) return res.reply(messages.unauthorized());
      allowedMimes = ["image/jpeg", "image/jpg", "image/png", "image/gif"];
      errAllowed = "JPG, JPEG, PNG,GIF";

      uploadBanner.fields([{ name: "profileIcon", maxCount: 1 }])(
        req,
        res,
        async function (error) {
          if (error) {
            return res.reply(messages.bad_request(error.message));
          } else {
            if (!req.body.fullname) {
              return res.reply(messages.not_found("User Fullname"));
            }
            let profileDetails = {};
            profileDetails = {
              fullname: req.body.fullname,
            };
            console.log("File dfgdgh", req.files.profileIcon);
            if (req.files.profileIcon !== undefined) {
              if (!allowedMimes.includes(req.files.profileIcon[0].mimetype)) {
                return res.reply(messages.invalid("File Type"));
              }
              console.log("File URL", req.files.profileIcon[0].location);
              profileDetails["profileIcon"] = req.files.profileIcon[0].location;
            }
            await User.findByIdAndUpdate(
              req.body.adminID,
              profileDetails,
              (err, user) => {
                if (err) return res.reply(messages.server_error());
                if (!user) return res.reply(messages.not_found("User"));
                req.session["name"] = req.body.Firstname;
                return res.reply(
                  messages.successfully("Admin Details Updated")
                );
              }
            ).catch((e) => {
              return res.reply(messages.error());
            });
          }
        }
      );
    } catch (error) {
      return res.reply(messages.server_error());
    }
  }

  async blockUnblockAdmin(req, res) {
    try {
      if (!req.userId) return res.reply(messages.unauthorized());
      if (!req.body.adminID) {
        return res.reply(messages.not_found("Admin ID"));
      }
      if (req.body.blockStatus === undefined) {
        return res.reply(messages.not_found("Block Status"));
      }
      let profileDetails = {};
      profileDetails = {
        status: req.body.blockStatus,
      };
      await User.findByIdAndUpdate(
        req.body.adminID,
        profileDetails,
        (err, user) => {
          if (err) return res.reply(messages.server_error());
          if (!user) return res.reply(messages.not_found("User"));
          return res.reply(messages.successfully("Admin Block Status Updated"));
        }
      ).catch((e) => {
        return res.reply(messages.error());
      });
    } catch (error) {
      return res.reply(messages.server_error());
    }
  }
}
module.exports = AuthController;
