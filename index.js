require("dotenv").config();

const express = require("express");
const app = express();

const crypto = require('crypto');
const helmet = require("helmet");

const rateLimit = require("express-rate-limit");
const { ipKeyGenerator } = require('express-rate-limit');


const cors = require("cors");
const http = require("http");

const cookieParser = require('cookie-parser');

const WebSocket = require("ws");

const mongoose = require("mongoose");
const { GridFSBucket } = require('mongodb');

//Fonksiyonlar.
var shut_down_server_in_safety_mode = require("./functions/shut_down_server_in_safety_mode");
var FormatDateFunction = require("./functions/FormatDateFunction");

//İnsert Fonksiyonları.
var create_audit_log = require("./insert_operations/create_audit_log");

//Şifreleme fonksiyonları.
var AES256GCMDecrypt = require("./EncryptModules/AES256GCMDecrypt");

var routes = require("./routes/index");

var { MONGODB_URI, NODE_ENV, TRUST_PROXY, MONGODB_NAME, BACKEND_VERSION, ISSUER } = process.env;

var PORT = process.env.PORT || 3000;

if( !BACKEND_VERSION ) throw "BACKEND_VERSION required. ";
if( !MONGODB_NAME ) throw "Database name not found.";
if( !NODE_ENV ) throw "NODE_ENV required. ";
if( !TRUST_PROXY ) throw "TRUST_PROXY required. ";
if( !ISSUER ) throw "ISSUER required. ";
if (!MONGODB_URI) throw "MONGODB_URI required.";

app.set('trust proxy', TRUST_PROXY === 'true');
app.disable('x-powered-by');

var suspiciousPatterns = [/\.php\b/i, /\.env\b/i, /wp-admin\b/i, /phpmyadmin\b/i];
app.use((req, res, next) => {
  if (suspiciousPatterns.some(function(i){   return i.test(req.originalUrl) } )) return res.status(404).send('Not found');
  return next();
});

var app_response = {
  request_date: new Date(),
  version: BACKEND_VERSION,
  success: true,
  issuer: ISSUER
};

app.get(
    "/health",
    async(req, res) => { 
        try{
            return res.status(200).json(app_response);
        }catch(err){
            console.log(err);
            return res.status(500).json({message: err });
        }
    }
);

var globalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req, res) => {
    var ip = req.headers['cf-connecting-ip'] || req.ip;
    return ipKeyGenerator(ip); 
  }
});

app.use(globalLimiter);

mongoose
  .connect(MONGODB_URI, 
  { 
    dbName: MONGODB_NAME,
    maxPoolSize: 20,
    minPoolSize: 2,
    serverSelectionTimeoutMS: 5000,
    maxIdleTimeMS: 30000
  })
  .then(async () => { 
    var app_db = mongoose.connection.db;

    var pictures_bucket = new GridFSBucket(app_db, { bucketName: 'pictures' });

    app.locals.pictures_bucket = pictures_bucket;
    app.locals.db = app_db;

    console.log("MongoDB connection completed. ");
  })
  .catch((err) => { 
    console.error("MongoDB connection failed:", err);
    return process.exit(1);
  });

var devOrigins = []; //localhost domain.
var prodOrigins = ["https://app.parkping.app"]; //prod domain.

var allowedOrigins = (NODE_ENV === 'production' ? prodOrigins : devOrigins).filter(Boolean);

var corsOptions = {
    origin: function (origin, callback) {

      if( NODE_ENV == 'production' ) {

        if ( !origin ) return callback(new Error("CORS: Origin required. "));
        if ( allowedOrigins.some(function(item){ return item === origin } ) ) return callback(null, true);
        return callback(new Error("CORS: This origin is not authorized. "));
      }
      else if( NODE_ENV == 'development' ) return callback(null, true);
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'If-None-Match'],   
    credentials: true,
    optionsSuccessStatus: 204,
    preflightContinue: false          
};

app.use((req, res, next) => {
  res.setHeader("Vary", "Origin");
  return next();
});

app.use(cors(corsOptions));

app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },  
  crossOriginOpenerPolicy: false,                       
  referrerPolicy: { policy: "strict-origin-when-cross-origin" }, 
  contentSecurityPolicy: false                            
}));

if(NODE_ENV == "production") app.use(helmet.hsts({ maxAge: 15552000, includeSubDomains: true, preload: true }));

app.use(cookieParser());

app.use((req, res, next) => {

  req.id = crypto.randomUUID();
  req.source_ip = req.headers['cf-connecting-ip'] || req.ip || req.connection.remoteAddress;

  res.setHeader("X-Request-Id", req.id);
  return next();
});

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ limit: '100kb', extended: true }));
app.use(express.static('public', { dotfiles: 'ignore' }));

app.use(create_audit_log);
app.use("/", routes);

var server = http.createServer(app);
var wss = new WebSocket.Server({ server });

wss.on("connection", (ws) => {
  console.log("WebSocket connection completed. ");

  ws.on("close", () => { ws.vehicle_id = null; });
  ws.on("error", () => { ws.vehicle_id = null; });

  ws.on("message", async (msg) => {
    try {

      var data_from_ui = JSON.parse(msg.toString());
      
      if (data_from_ui && data_from_ui.vehicle_id) {

        ws.vehicle_id = data_from_ui.vehicle_id.toString();

        return ws.send(JSON.stringify({ success: true, subscribed_vehicle_id: ws.vehicle_id }));
      }

      return ws.send(JSON.stringify({ success: true }));
    } catch (error) { 
      return ws.send(JSON.stringify({ error: true, message: "Invalid request" }));
    }
  });
});

app.use((req, res) => {
  return res.status(404).json({ error: 'Not Found.' });
});

app.use((err, req, res, next) => {
  return res.status(500).json({ error: 'Internal Server Error.' });
});

server.listen(PORT, () => { 
  console.log("Server running. ");
  
  if (mongoose.connection.readyState === 1) start_conversationmessage_watcher(wss);
  else mongoose.connection.once("open", () => start_conversationmessage_watcher(wss));
});

process.on('SIGTERM', shut_down_server_in_safety_mode);
process.on('SIGINT', shut_down_server_in_safety_mode);

process.on("uncaughtException", (err) => {
  console.error("Unexpected error!" + err);
});
process.on("unhandledRejection", (reason) => {
  console.error("Unexpected promise error!" + reason);
});

function start_conversationmessage_watcher(wss) {
  var pipeline = [
    { $match: { operationType: { $in: ["insert", "update", "replace", "delete"] } } }
  ];

  var change_stream = mongoose
    .connection
    .collection("conversationmessages")
    .watch(pipeline, { fullDocument: "updateLookup" });

  change_stream.on("change", (change) => {
    var doc = change.fullDocument;
    if (!doc || !doc.vehicle_id) return;

    var changed_vehicle_id = doc.vehicle_id.toString();

    wss.clients.forEach((ws) => {
      if (ws.readyState !== WebSocket.OPEN) return;
      if (!ws.vehicle_id) return;

      if (ws.vehicle_id === changed_vehicle_id) {

        var changed_data_informations = {
          type: "conversation_message",
          operation: change.operationType,
          vehicle_id: changed_vehicle_id,
          data: doc,
          documentKey: change.documentKey,
          updateDescription: change.updateDescription || null
        };

        var conversation_message_data = doc.data;

        conversation_message_data.message = AES256GCMDecrypt(conversation_message_data.message);
        conversation_message_data.created_date = FormatDateFunction(String(conversation_message_data.created_date));

        if( conversation_message_data.is_public !== true ) return;
        ws.send(JSON.stringify(conversation_message_data));
      }
    });
  });

  change_stream.on("error", (err) => {
    console.error("conversationmessage watch error:", err);
  });

  console.log("conversationmessage change stream started.");
};

module.exports = app;