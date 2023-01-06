const http = require("http");
const express = require("express");
const session = require("express-session");
const bodyParser = require("body-parser");
const helmet = require("helmet");
const cors = require("cors");
const compression = require("compression");
const morgan = require("morgan");
const routes = require("./routes");


function Router() {
  this.app = express();
  this.httpServer = http.createServer(this.app);
  // console.log("IP ", process.env.ORIGIN_IP+" "+process.env.ORIGIN_DOMAIN)
  
  this.app.use('/style/',function(req,res,next){
    //const {theme,themeID} = req.params;  
    console.log("working directory",process.cwd());
    express.static(process.cwd()+"/public/")(req,res,next);
    });
    
    this.app.use('/image/', express.static('public'));
    //this.app.use('/image', express.static('image'));
  
  this.corsOptions = {
    // origin: [process.env.ORIGIN_IP, process.env.ORIGIN_DOMAIN], 
    // methods: ["GET", "POST", "PUT", "DELETE"],
    // allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
    origin: ["*"],
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  };

  this.app.use(
    cors({
      maxAge: 86400,
      preflightContinue: true, // Allow us to manually add to preflights
    })
  );

  this.app.use(function (req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");

    res.header("Access-Control-Allow-Headers", "*");
    if (req.method === "OPTIONS") {
      res.setHeader("Cache-Control", "public, max-age=86400");
    }
    next();
  });

  this.app.use(bodyParser.json());
  this.app.use(bodyParser.urlencoded({ extended: true }));
}

Router.prototype.initialize = function () {
  this.setupMiddleware();
  this.setupServer();
};

Router.prototype.setupMiddleware = function () {
  this.app.disable("etag");
  this.app.enable("trust proxy");
  this.app.use(cors(this.corsOptions));
  this.app.use(
    session({
      secret: process.env.JWT_SECRET,
      resave: true,
      saveUninitialized: true,
    })
  );

  this.app.use(compression());
  // this.app.set('view engine', 'ejs');
  this.app.engine("html", require("ejs").renderFile);
  this.app.use(bodyParser.json({ limit: "16mb" }));
  this.app.use(
    bodyParser.urlencoded({
      limit: "16mb",
      extended: true,
      parameterLimit: 50000,
    })
  );
  // this.app.set("views", "./seeds");
  // this.app.set("view engine", "ejs");
  // this.app.use(express.static("./seeds"));
  this.app.use(this.routeConfig);
  this.app.use("/api/v1", routes);
  this.app.use("*", this.routeHandler);
  this.app.use(this.logErrors);
  this.app.use(this.errorHandler);
};

Router.prototype.setupServer = function () {
  this.httpServer = http.Server(this.app);
  this.httpServer.timeout = 300000;
  this.httpServer.listen(process.env.PORT, "0.0.0.0", () =>
    log.green(`Spinning on ${process.env.PORT}`)
  );
};

Router.prototype.routeConfig = function (req, res, next) {
  req.sRemoteAddress =
    req.headers["x-forwarded-for"] || req.connection.remoteAddress;
  if (req.path === "/ping") return res.status(200).send({});
  res.reply = ({ statusCode, code, message }, data = {}, header = undefined) => {
    res.status(code).header(header).json({ statusCode, message, data });
  };
  next();
};

Router.prototype.routeHandler = function (req, res) {
  return res.render("Error/404");
};

Router.prototype.logErrors = function (err, req, res, next) {
  log.error(`${req.method} ${req.url}`);
  log.error("body -> ", req.body);
  log.error(err.stack);
  return next(err);
};

Router.prototype.errorHandler = function (err, req, res, next) {
  res.status(500);
  res.send({ message: err });
};

module.exports = new Router();
