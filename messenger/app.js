/*
 * Copyright 2016-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

/* jshint node: true, devel: true */
'use strict';

const
    bodyParser = require('body-parser'),
    config = require('config'),
    crypto = require('crypto'),
    express = require('express'),
    https = require('https'),
    request = require('request');

var Bird = {};

var app = express();
app.set('port', process.env.PORT || 5000);
app.set('view engine', 'ejs');
app.use(bodyParser.json({ verify: verifyRequestSignature }));
app.use(express.static('public'));

sendToDB();

/*
 * Be sure to setup your config values before running this code. You can 
 * set them using environment variables or modifying the config file in /config.
 *
 */

var longitude, latitude, direction, id, amount, birdType, description, height;
var amountfirsttime = 0, altfirsttime = 0;

// App Secret can be retrieved from the App Dashboard
const APP_SECRET = (process.env.MESSENGER_APP_SECRET) ?
    process.env.MESSENGER_APP_SECRET :
    config.get('appSecret');

// Arbitrary value used to validate a webhook
const VALIDATION_TOKEN = (process.env.MESSENGER_VALIDATION_TOKEN) ?
    (process.env.MESSENGER_VALIDATION_TOKEN) :
    config.get('validationToken');

// Generate a page access token for your page from the App Dashboard
const PAGE_ACCESS_TOKEN = (process.env.MESSENGER_PAGE_ACCESS_TOKEN) ?
    (process.env.MESSENGER_PAGE_ACCESS_TOKEN) :
    config.get('pageAccessToken');

// URL where the app is running (include protocol). Used to point to scripts and 
// assets located at this address. 
const SERVER_URL = (process.env.SERVER_URL) ?
    (process.env.SERVER_URL) :
    config.get('serverURL');

if (!(APP_SECRET && VALIDATION_TOKEN && PAGE_ACCESS_TOKEN && SERVER_URL)) {
  console.error("Missing config values");
  process.exit(1);
}

/*
 * Use your own validation token. Check that the token used in the Webhook 
 * setup is the same token used here.
 *
 */
app.get('/webhook', function(req, res) {
  if (req.query['hub.mode'] === 'subscribe' &&
      req.query['hub.verify_token'] === VALIDATION_TOKEN) {
    console.log("Validating webhook");
    res.status(200).send(req.query['hub.challenge']);
  } else {
    console.error("Failed validation. Make sure the validation tokens match.");
    res.sendStatus(403);
  }
});


/*
 * All callbacks for Messenger are POST-ed. They will be sent to the same
 * webhook. Be sure to subscribe your app to your page to receive callbacks
 * for your page. 
 * https://developers.facebook.com/docs/messenger-platform/product-overview/setup#subscribe_app
 *
 */
app.post('/webhook', function (req, res) {
  var data = req.body;

  // Make sure this is a page subscription
  if (data.object == 'page') {
    // Iterate over each entry
    // There may be multiple if batched
    data.entry.forEach(function(pageEntry) {
      var pageID = pageEntry.id;
      var timeOfEvent = pageEntry.time;

      // Iterate over each messaging event
      pageEntry.messaging.forEach(function(messagingEvent) {
        if (messagingEvent.options) {
          receivedAuthentication(messagingEvent);
        }
        else if (messagingEvent.message) {
          receivedMessage(messagingEvent);
        }
        else if (messagingEvent.delivery) {
          receivedDeliveryConfirmation(messagingEvent);
        }
        else if (messagingEvent.postback) {
          sendHeights(null);
          receivedPostback(messagingEvent);
        }
        else if (messagingEvent.read) {
          receivedMessageRead(messagingEvent);
        } else if (messagingEvent.account_linking) {
          receivedAccountLink(messagingEvent);
        } else {
          console.log("Webhook received unknown messagingEvent: ", messagingEvent);
        }
      });
    });

    // Assume all went well.
    //
    // You must send back a 200, within 20 seconds, to let us know you've 
    // successfully received the callback. Otherwise, the request will time out.
    res.sendStatus(200);
  }
});

/*
 * This path is used for account linking. The account linking call-to-action
 * (sendAccountLinking) is pointed to this URL. 
 * 
 */
app.get('/authorize', function(req, res) {
  var accountLinkingToken = req.query.account_linking_token;
  var redirectURI = req.query.redirect_uri;

  // Authorization Code should be generated per user by the developer. This will 
  // be passed to the Account Linking callback.
  var authCode = "1234567890";

  // Redirect users to this URI on successful login
  var redirectURISuccess = redirectURI + "&authorization_code=" + authCode;

  res.render('authorize', {
    accountLinkingToken: accountLinkingToken,
    redirectURI: redirectURI,
    redirectURISuccess: redirectURISuccess
  });
});

/*
 * Verify that the callback came from Facebook. Using the App Secret from 
 * the App Dashboard, we can verify the signature that is sent with each 
 * callback in the x-hub-signature field, located in the header.
 *
 * https://developers.facebook.com/docs/graph-api/webhooks#setup
 *
 */
function verifyRequestSignature(req, res, buf) {
  var signature = req.headers["x-hub-signature"];

  if (!signature) {
    // For testing, let's log an error. In production, you should throw an 
    // error.
    console.error("Couldn't validate the signature.");
  } else {
    var elements = signature.split('=');
    var method = elements[0];
    var signatureHash = elements[1];

    var expectedHash = crypto.createHmac('sha1', APP_SECRET)
        .update(buf)
        .digest('hex');

    if (signatureHash != expectedHash) {
      throw new Error("Couldn't validate the request signature.");
    }
  }
}

/*
 * Authorization Event
 *
 * The value for 'optin.ref' is defined in the entry point. For the "Send to 
 * Messenger" plugin, it is the 'data-ref' field. Read more at 
 * https://developers.facebook.com/docs/messenger-platform/webhook-reference/authentication
 *
 */
function receivedAuthentication(event) {
  var senderID = event.sender.id;
  var recipientID = event.recipient.id;
  var timeOfAuth = event.timestamp;

  // The 'ref' field is set in the 'Send to Messenger' plugin, in the 'data-ref'
  // The developer can set this to an arbitrary value to associate the 
  // authentication callback with the 'Send to Messenger' click event. This is
  // a way to do account linking when the user clicks the 'Send to Messenger' 
  // plugin.
  var passThroughParam = event.optin.ref;

  console.log("Received authentication for user %d and page %d with pass " +
      "through param '%s' at %d", senderID, recipientID, passThroughParam,
      timeOfAuth);

  // When an authentication is received, we'll send a message back to the sender
  // to let them know it was successful.
  sendTextMessage(senderID, "Authentication successful");
}


/*
 * Delivery Confirmation Event
 *
 * This event is sent to confirm the delivery of a message. Read more about
 * these fields at https://developers.facebook.com/docs/messenger-platform/webhook-reference/message-delivered
 *
 */
function receivedDeliveryConfirmation(event) {
  var senderID = event.sender.id;
  var recipientID = event.recipient.id;
  var delivery = event.delivery;
  var messageIDs = delivery.mids;
  var watermark = delivery.watermark;
  var sequenceNumber = delivery.seq;

  if (messageIDs) {
    messageIDs.forEach(function(messageID) {
      console.log("Received delivery confirmation for message ID: %s",
          messageID);
    });
  }

  console.log("All message before %d were delivered.", watermark);
}

/*
 * Postback Event
 *
 * This event is called when a postback is tapped on a Structured Message.
 * https://developers.facebook.com/docs/messenger-platform/webhook-reference/postback-received
 *
 */
function receivedPostback(event) {
  var senderID = event.sender.id;
  var recipientID = event.recipient.id;
  var timeOfPostback = event.timestamp;


  // The 'payload' param is a developer-defined field which is set in a postback
  // button for Structured Messages.
  var payload = event.postback.payload;

  console.log("Received postback for user %d and page %d with payload '%s' " +
      "at %d", senderID, recipientID, payload, timeOfPostback);

  // When a postback is called, we'll send a message back to the sender to
  // let them know it was successful
  switch(payload)
  {
    case "Bird_Picture_Agur":
      Bird.birdType = 'עגור';
      sendHeights(senderID);
      payload = null;
      break;
    case "Bird_Picture_Hasida":
      Bird.birdType = 'חסידה';
      sendHeights(senderID);
      payload = null;
      break;
    case "Bird_Picture_Akev":
      Bird.birdType = 'עקב';
      sendHeights(senderID);
      payload = null;
      break;
    case "Bird_Picture_Zarzir":
      Bird.birdType = 'זרזיר';
      sendHeights(senderID);
      payload = null;
      break;
    case "Bird_Picture_Kata":
      Bird.birdType = 'קטה';
      sendHeights(senderID);
      payload = null;
      break;
    case "Bird_Picture_Orev":
      Bird.birdType = 'עורב';
      sendHeights(senderID);
      payload = null;
      break;
    case "Bird_Picture_Shahaf":
      Bird.birdType = 'שחף';
      sendHeights(senderID);
      payload = null;
      break;
    case "Bird_Picture_Saknai":
      Bird.birdType = 'שקנאי';
      sendHeights(senderID);
      payload = null;
      break;
    case "Bird_Picture_Kormoran":
      Bird.birdType = 'קורמורן';
      sendHeights(senderID);
      payload = null;
      break;
    case "Bird_Picture_Ieat":
      Bird.birdType = 'עיט';
      sendHeights(senderID);
      payload = null;
      break;
    case "Bird_Picture_Unknown":
      Bird.birdType = 'לא ידוע';
      sendHeights(senderID);
      payload = null;
      break;
    default:
      sendTextMessage(senderID, "error text:"+payload);
  }

}

/*
 * Message Read Event
 *
 * This event is called when a previously-sent message has been read.
 * https://developers.facebook.com/docs/messenger-platform/webhook-reference/message-read
 *
 */
function receivedMessageRead(event) {
  var senderID = event.sender.id;
  var recipientID = event.recipient.id;

  // All messages before watermark (a timestamp) or sequence have been seen.
  var watermark = event.read.watermark;
  var sequenceNumber = event.read.seq;

  console.log("Received message read event for watermark %d and sequence " +
      "number %d", watermark, sequenceNumber);
}

/*
 * Account Link Event
 *
 * This event is called when the Link Account or UnLink Account action has been
 * tapped.
 * https://developers.facebook.com/docs/messenger-platform/webhook-reference/account-linking
 *
 */
function receivedAccountLink(event) {
  var senderID = event.sender.id;
  var recipientID = event.recipient.id;

  var status = event.account_linking.status;
  var authCode = event.account_linking.authorization_code;

  console.log("Received account link event with for user %d with status %s " +
      "and auth code %s ", senderID, status, authCode);
}

/*
 * Message Event
 *
 * This event is called when a message is sent to your page. The 'message' 
 * object format can vary depending on the kind of message that was received.
 * Read more at https://developers.facebook.com/docs/messenger-platform/webhook-reference/message-received
 *
 * For this example, we're going to echo any text that we get. If we get some 
 * special keywords ('button', 'generic', 'receipt'), then we'll send back
 * examples of those bubbles to illustrate the special message bubbles we've 
 * created. If we receive a message with an attachment (image, video, audio), 
 * then we'll simply confirm that we've received the attachment.
 * 
 */
function receivedMessage(event) {
  var senderID = event.sender.id;
  var recipientID = event.recipient.id;
  var timeOfMessage = event.timestamp;
  var message = event.message;

  console.log("Received message for user %d and page %d at %d with message:",
      senderID, recipientID, timeOfMessage);
  console.log(JSON.stringify(message));

  var isEcho = message.is_echo;
  var messageId = message.mid;
  var appId = message.app_id;
  var metadata = message.metadata;

  // You may get a text or attachment but not both
  var messageText = message.text;
  var messageAttachments = message.attachments;
  var quickReply = message.quick_reply;

  if (isEcho) {
    // Just logging message echoes to console
    console.log("Received echo for message %s and app %d with metadata %s",
        messageId, appId, metadata);
    return;
  } else if (quickReply) {
    var quickReplyPayload = quickReply.payload;
    console.log("Quick reply for message %s with payload %s",
        messageId, quickReplyPayload);

    switch(quickReplyPayload)
    {
      case "Size_Low":case "Size_Middle":case "Size_High":
      sendPicturesOfBirds(senderID,quickReplyPayload);
      break;
      case "Size_Unknown":
        Bird.birdType = "לא ידוע";
        sendHeights(senderID);
        break;
      case "Amount_Of_Birds_Low":
        Bird.amount = "500-";
        sizeOfBird(senderID);
        quickReplyPayload = null;
        break;
      case "Amount_Of_Birds_Middle":
        Bird.amount = "500-4000";
        sizeOfBird(senderID);
        quickReplyPayload = null;
        break;
      case "Amount_Of_Birds_High":
        Bird.amount = "4000+";
        sizeOfBird(senderID);
        quickReplyPayload = null;
        break;
      case "Amount_Of_Birds_Exact":
        if(amountfirsttime == 0)
        {
          amountfirsttime++;
        }
        break;
      case "HEIGHT_LOW":
        Bird.height = "450-";
        sendShareButton(senderID);
        quickReplyPayload = null;
        break;
      case "HEIGHT_MIDDLE":
        Bird.height = "450-1000";
        sendShareButton(senderID);
        quickReplyPayload = null;
        break;
      case "HEIGHT_HIGH":
        Bird.height = "1000+";
        sendShareButton(senderID);
        quickReplyPayload = null;
        break;
      case "HEIGHT_UNKNOWN":
        Bird.height = "לא ידוע";
        sendShareButton(senderID);
        quickReplyPayload = null;
        break;
      case "HEIGHT_EXACT":
        if(altfirsttime == 0) {
          altfirsttime++;
        }
        break;
      default:
        sendTextMessage(senderID, "error text:"+quickReplyPayload);
    }



    //sendHeights(senderID);

    return;
  }

  if (messageText) {

    // If we receive a text message, check to see if it matches any special
    // keywords and send back the corresponding example. Otherwise, just echo
    // the text we received.

    //*****************************************************
    //SEEN BY:
    //sendReadReceipt(senderID);
    //*****************************************************

    if(altfirsttime == 1)
    {
      if(messageText == 'בטל')
      {
        altfirsttime--;
        sendHeights(senderID);
      }
      else if(isNaN(messageText)){
        sendTextMessage(senderID, "הכנס מספר או הקלד 'בטל'");
      }
      else {
        Bird.height = parseInt(messageText);
        sendShareButton(senderID);
        quickReplyPayload = null;
        altfirsttime--;
      }
    }
    else if(amountfirsttime == 1)
    {
      if(messageText == 'בטל')
      {
        amountfirsttime--;
        sendAmountOfBirds(senderID);
      }
      else if(isNaN(messageText)){
        sendTextMessage(senderID, "הכנס מספר או הקלד 'בטל'");
      }
      else {
        Bird.amount = parseInt(messageText);
        sizeOfBird(senderID);
        quickReplyPayload = null;
        amountfirsttime--;
      }
    }
    else {
      switch (messageText) {
        case 'דווח':
          altfirsttime = 0;
          amountfirsttime = 0;
          //var bird = new Bird();
          sendTypingOn(senderID);
          sendLocation(senderID);
          break;

        default:
          sendTextMessage(senderID, "אני משער שראית כמה ציפורים ולא פנית אליי סתם, אם כן כתוב: דווח");
      }
    }
  } else if (messageAttachments) {
    Bird.latitude = messageAttachments[0].payload.coordinates.lat;
    Bird.longitude = messageAttachments[0].payload.coordinates.long;
    Bird.id = senderID;

    sendTypingOn(senderID);
    sendAmountOfBirds(senderID);
  }
}

function sendToDB(id)
{
  var req = {
    reporterName: "בוט ציפורים",
    latitude: Bird.latitude,
    longitude: Bird.longitude,
    birdType: Bird.birdType,
    amount: Bird.amount,
    height: Bird.height,
    flockId: "2357",
    areaName:"",
    credibility:"",
    time:"",
    img:Bird.image
  };

  console.log(req);

  request.post({
    headers: {'content-type' : 'application/x-www-form-urlencoded'},
    url:     'http://birdsbotdb.herokuapp.com/reports',
    form:    req
  });

  // request.post(
  //     'http://birdsbotdb.herokuapp.com/reports',
  //     json: true,
  //     multipart: {
  //       chunked: false,
  //           data: [
  //         {
  //           'content-type': 'application/json',
  //           body: req
  //         }
  //       ]
  //     },
  //     function (error, response, body) {
  //       if (!error && response.statusCode == 200) {
  //         console.log(body)
  //       }
  //       else
  //       {
  //         //log file
  //       }
  //     }
  // );
}

function buildDescription()
{
  Bird.description = "נצפתה להקה ";

  Bird.description += "עם " + Bird.amount;

  switch(Bird.birdType)
  {
    case 'עגור':
      Bird.description += " עגורים ";
      Bird.image = "http://www.agamon-hula.co.il/files/images/gallery2/gallery_015.gallery.jpg";//window.btoa(SERVER_URL + "/assets/agur.jpg");
      break;
    case 'עקב':
      Bird.description += " עקבים ";
      Bird.image = "http://www.agamon-hula.co.il/files/images/gallery2/gallery_015.gallery.jpg";//window.btoa(SERVER_URL + "/assets/akev.jpg");
      break;
    case 'דיה':
      Bird.description += " דיות ";
      Bird.image = "http://www.agamon-hula.co.il/files/images/gallery2/gallery_015.gallery.jpg";//window.btoa(SERVER_URL + "/assets/dia.jpg");
      break;
    case 'חסידה':
      Bird.description += " חסידות ";
      Bird.image = "http://www.agamon-hula.co.il/files/images/gallery2/gallery_015.gallery.jpg";//window.btoa(SERVER_URL + "/assets/hasida.jpg");
      break;
    case 'חוגלה':
      Bird.description += " חוגלות ";
      Bird.image = "http://www.agamon-hula.co.il/files/images/gallery2/gallery_015.gallery.jpg";//window.btoa(SERVER_URL + "/assets/hogla.jpg");
      break;
    case 'עיט':
      Bird.description += " עיטים ";
      Bird.image = "http://www.agamon-hula.co.il/files/images/gallery2/gallery_015.gallery.jpg";//window.btoa(SERVER_URL + "/assets/Ieat.jpg");
      break;
    case 'קורמורן':
      Bird.description += " קורמורנים ";
      Bird.image = "http://www.agamon-hula.co.il/files/images/gallery2/gallery_015.gallery.jpg";//window.btoa(SERVER_URL + "/assets/kormoran.jpg");
      break;
    case 'קטה':
      Bird.description += " קטות ";
      Bird.image = "http://www.agamon-hula.co.il/files/images/gallery2/gallery_015.gallery.jpg";//window.btoa(SERVER_URL + "/assets/kata.jpg");
      break;
    case 'זרזיר':
      Bird.description += " זרזירים ";
      Bird.image = "http://www.agamon-hula.co.il/files/images/gallery2/gallery_015.gallery.jpg";//window.btoa(SERVER_URL + "/assets/zarzir.jpg");
      break;
    case 'שחף':
      Bird.description += " שחפים ";
      Bird.image = "http://www.agamon-hula.co.il/files/images/gallery2/gallery_015.gallery.jpg";//window.btoa(SERVER_URL + "/assets/shahaf.jpg");
      break;
    case 'עורב':
      Bird.description += " עורבים ";
      Bird.image = "http://www.agamon-hula.co.il/files/images/gallery2/gallery_015.gallery.jpg";//window.btoa(SERVER_URL + "/assets/orev.jpg");
      break;
    default:
      Bird.description += "מסוג לא ידוע ";
      Bird.image = "http://www.agamon-hula.co.il/files/images/gallery2/gallery_015.gallery.jpg";
  }


  Bird.description += "בגובה " + Bird.altitude;

  Bird.description += " במיקום" +Bird.latitude + "," + Bird.longitude + "(lat,lon)";
}

function sendShareButton(recipientId) {
  buildDescription();
  sendToDB(recipientId);

  var messageData = {
    recipient: {
      id: recipientId
    },
    message:{
      attachment:{
        type:"template",
        payload:{
          template_type:"generic",
          elements:[
            {
              title:"הדיווח שלך עזר לחיל האוויר לשמור על שמיים בטוחים. בא לך לספר לחבריך על הציפורים שראית?",
              subtitle:Bird.description,
              image_url: SERVER_URL + "/assets/Logo.png",
              buttons:[
                {
                  type:"element_share"
                }
              ]
            }
          ]
        }
      }
    }
  };

  callSendAPI(messageData);
}

/*
 * Send a text message using the Send API.
 *
 */
function sendTextMessage(recipientId, messageText) {
  var messageData = {
    recipient: {
      id: recipientId
    },
    message: {
      text: messageText,
      metadata: "DEVELOPER_DEFINED_METADATA"
    }
  };

  callSendAPI(messageData);
}

/*
 * Send a button message using the Send API.
 */
function sendAmountOfBirds(recipientId) {
  var messageData = {
    recipient: {
      id: recipientId
    },
    message: {
      text:"קיבלתי את מיקומך, בוא נדבר קצת על הציפורים שראית, אתה יכול להגיד לי כמה ציפורים ראית? תרגיש חופשי לבחור אחת מהאופציות או לכתוב מספר מדויק",
      quick_replies: [
        {
          content_type:"text",
          title: "0-500",
          payload:"Amount_Of_Birds_Low"
        },
        {
          content_type:"text",
          title: "500-4000",
          payload:"Amount_Of_Birds_Middle"
        },
        {
          content_type:"text",
          title: "4000 ומעלה",
          payload:"Amount_Of_Birds_High"
        },
        {
          content_type:"text",
          title: "מספר מדויק",
          payload:"Amount_Of_Birds_Exact"
        }
      ]
    }
  };

  callSendAPI(messageData);
}

/*
 * Send a button message using the Send API.
 */
function sendLocation(recipientId) {
  var messageData = {
    recipient: {
      id: recipientId
    },
    message: {
      text: "קודם כל, בחר את מיקומך",
      quick_replies: [
        {
          "content_type":"location",
          title: "מיקום"
        }
      ]
    }
  };

  callSendAPI(messageData);
}

function sizeOfBird(recipientId) {
  sendTypingOn(recipientId);
  var messageData = {
    recipient: {
      id: recipientId
    },
    message: {
      text: "אתה יכול להגיד לי מה הגודל של הציפורים שראית?",
      quick_replies: [
        {
          content_type: "text",
          title: "קטנות",
          payload: "Size_Low"
        },
        {
          content_type: "text",
          title: "בינוניות",
          payload: "Size_Middle"
        },
        {
          content_type: "text",
          title: "גדולות",
          payload: "Size_High"
        },
        {
          content_type: "text",
          title: "לא יודע",
          payload: "Size_Unknown"
        }
      ]
    }
  };

  callSendAPI(messageData);
}

/*
 * Send a Structured Message (Generic Message type) using the Send API.
 *
 */
function sendPicturesOfBirds(recipientId,quickReplyPayload) {
  sendTypingOn(recipientId);
  sendTextMessage(recipientId,"אחלה, יש סיכוי ששמת לב לסוג הציפור?");
  switch(quickReplyPayload)
  {
    case "Size_Low":
      var messageData = {
        recipient: {
          id: recipientId
        },
        message: {
          attachment: {
            type: "template",
            payload: {
              template_type: "generic",
              elements: [
                {
                  title: "זרזיר",
                  subtitle: "",
                  item_url: "",
                  image_url: SERVER_URL + "/assets/zarzir.jpg",
                  buttons: [{
                    type: "web_url",
                    url: "http://www.birds.org.il/he/species-page.aspx?speciesId=431",
                    title: "קרא עוד"
                  },
                    {
                      type: "postback",
                      title: "זרזיר",
                      payload: "Bird_Picture_Zarzir"
                    }
                  ]
                }, {
                  title: "חוגלה",
                  subtitle: "",
                  item_url: "",
                  image_url: SERVER_URL + "/assets/hogla.jpg",
                  buttons: [{
                    type: "web_url",
                    url: "http://www.birds.org.il/he/species-page.aspx?speciesId=2",
                    title: "קרא עוד"
                  },
                    {
                      type: "postback",
                      title: "חוגלה",
                      payload: "Bird_Picture_Hogla"
                    }
                  ]
                }, {
                  title: "קטה",
                  subtitle: "",
                  item_url: "",
                  image_url: SERVER_URL + "/assets/kata.jpg",
                  buttons: [{
                    type: "web_url",
                    url: "http://www.birds.org.il/he/species-page.aspx?speciesId=273",
                    title: "קרא עוד"
                  },
                    {
                      type: "postback",
                      title: "קטה",
                      payload: "Bird_Picture_Kata"
                    }
                  ]
                }
              ]
            }
          }
        }
      };
      break;
    case "Size_Middle":
      var messageData = {
        recipient: {
          id: recipientId
        },
        message: {
          attachment: {
            type: "template",
            payload: {
              template_type: "generic",
              elements: [
                {
                  title: "דיה",
                  subtitle: "",
                  item_url: "",
                  image_url: SERVER_URL + "/assets/dia.jpg",
                  buttons: [{
                    type: "web_url",
                    url: "http://www.birds.org.il/he/species-page.aspx?speciesId=120",
                    title: "קרא עוד"
                  },
                    {
                      type: "postback",
                      title: "דיה",
                      payload: "Bird_Picture_Dia"
                    }
                  ]
                }, {
                  title: "עקב חורף",
                  subtitle: "",
                  item_url: "",
                  image_url: SERVER_URL + "/assets/akev.jpg",
                  buttons: [{
                    type: "web_url",
                    url: "http://www.birds.org.il/he/species-page.aspx?speciesId=138",
                    title: "קרא עוד"
                  },
                    {
                      type: "postback",
                      title: "עקב חורף",
                      payload: "Bird_Picture_Akev"
                    }
                  ]
                }, {
                  title: "שחף",
                  subtitle: "",
                  item_url: "",
                  image_url: SERVER_URL + "/assets/shahaf.jpg",
                  buttons: [{
                    type: "web_url",
                    url: "http://www.birds.org.il/he/species-page.aspx?speciesId=244",
                    title: "קרא עוד"
                  },
                    {
                      type: "postback",
                      title: "שחף",
                      payload: "Bird_Picture_Shahaf"
                    }
                  ]
                }
              ]
            }
          }
        }
      };
      /*var messageData = {
       recipient: {
       id: recipientId
       },
       message: {
       attachment: {
       type: "template",
       payload: {
       template_type: "generic",
       elements: [
       {
       title: "עורב",
       subtitle: "",
       item_url: "",
       image_url: SERVER_URL + "/assets/orev.jpg",
       buttons: [{
       type: "web_url",
       url: "http://www.birds.org.il/he/species-page.aspx?speciesId=339",
       title: "קרא עוד"
       },
       {
       type: "postback",
       title: "עורב",
       payload: "Bird_Picture_Orev"
       }
       ],
       }, {
       title: "עיט",
       subtitle: "",
       item_url: "",
       image_url: SERVER_URL + "/assets/עיט בינוני.jpg",
       buttons: [{
       type: "web_url",
       url: "http://www.birds.org.il/he/species-page.aspx?speciesId=146",
       title: "קרא עוד"
       },
       {
       type: "postback",
       title: "עיט",
       payload: "Bird_Picture_Ieat"
       }
       ]
       }, {
       title: "קורמורן",
       subtitle: "",
       item_url: "",
       image_url: SERVER_URL + "/assets/kormoran.jpg",
       buttons: [{
       type: "web_url",
       url: "http://www.birds.org.il/he/species-page.aspx?speciesId=102",
       title: "קרא עוד"
       },
       {
       type: "postback",
       title: "קורמורן",
       payload: "Bird_Picture_Kormoran"
       }
       ]
       }
       ]
       }
       }
       }
       };*/
      break;
    case "Size_High":
      var messageData = {
        recipient: {
          id: recipientId
        },
        message: {
          attachment: {
            type: "template",
            payload: {
              template_type: "generic",
              elements: [
                {
                  title: "שקנאי",
                  subtitle: "",
                  item_url: "",
                  image_url: SERVER_URL + "/assets/saknai.jpg",
                  buttons: [{
                    type: "web_url",
                    url: "http://www.birds.org.il/he/species-page.aspx?speciesId=95",
                    title: "קרא עוד"
                  },
                    {
                      type: "postback",
                      title: "שקנאי",
                      payload: "Bird_Picture_Saknai"
                    }
                  ]
                }, {
                  title: "חסידה",
                  subtitle: "",
                  item_url: "",
                  image_url: SERVER_URL + "/assets/hasida.jpg",
                  buttons: [{
                    type: "web_url",
                    url: "http://www.birds.org.il/he/species-page.aspx?speciesId=72",
                    title: "קרא עוד"
                  },
                    {
                      type: "postback",
                      title: "חסידה",
                      payload: "Bird_Picture_Hasida"
                    }
                  ]
                }, {
                  title: "עגור",
                  subtitle: "",
                  item_url: "",
                  image_url: SERVER_URL + "/assets/agur.jpg",
                  buttons: [{
                    type: "web_url",
                    url: "http://www.birds.org.il/he/species-page.aspx?speciesId=162",
                    title: "קרא עוד"
                  },
                    {
                      type: "postback",
                      title: "עגור",
                      payload: "Bird_Picture_Agur"
                    }
                  ]
                }
              ]
            }
          }
        }
      };
      break;
  }


  callSendAPI(messageData);
}

/*
 * Send a message with Quick Reply buttons.
 *
 */
function sendHeights(recipientId) {
  sendTypingOn(recipientId);

  var messageData = {
    recipient: {
      id: recipientId
    },
    message: {
      text: "שאלה אחרונה, אני מבטיח. מה היה הגובה בו הציפורים עפו?",
      quick_replies: [
        {
          content_type:"text",
          title:"0-450 מטרים",
          payload:"HEIGHT_LOW"
        },
        {
          content_type:"text",
          title:"450-1000 מטרים",
          payload:"HEIGHT_MIDDLE"
        },
        {
          content_type:"text",
          title:"1000 ומעלה",
          payload:"HEIGHT_HIGH"
        },
        {
          content_type:"text",
          title:"לא ידוע",
          payload:"HEIGHT_UNKNOWN"
        } ,
        {
          content_type:"text",
          title:"גובה מדויק",
          payload:"HEIGHT_EXACT"
        }
      ]
    }
  };

  callSendAPI(messageData);
}

/*
 * Turn typing indicator on
 *
 */
function sendTypingOn(recipientId) {
  console.log("Turning typing indicator on");

  var messageData = {
    recipient: {
      id: recipientId
    },
    sender_action: "typing_on"
  };

  callSendAPI(messageData);
}

/*
 * Turn typing indicator off
 *
 */
function sendTypingOff(recipientId) {
  console.log("Turning typing indicator off");

  var messageData = {
    recipient: {
      id: recipientId
    },
    sender_action: "typing_off"
  };

  callSendAPI(messageData);
}

/*
 * Call the Send API. The message data goes in the body. If successful, we'll 
 * get the message id in a response 
 *
 */
function callSendAPI(messageData) {
  request({
    uri: 'https://graph.facebook.com/v2.6/me/messages',
    qs: { access_token: PAGE_ACCESS_TOKEN },
    method: 'POST',
    json: messageData

  }, function (error, response, body) {
    if (!error && response.statusCode == 200) {
      var recipientId = body.recipient_id;
      var messageId = body.message_id;

      if (messageId) {
        console.log("Successfully sent message with id %s to recipient %s",
            messageId, recipientId);
      } else {
        console.log("Successfully called Send API for recipient %s",
            recipientId);
      }
    } else {
      console.error("Failed calling Send API", response.statusCode, response.statusMessage, body.error);
    }
  });
}

// Start server
// Webhooks must be available via SSL with a certificate signed by a valid 
// certificate authority.
app.listen(app.get('port'), function() {
  console.log('Node app is running on port', app.get('port'));
});

module.exports = app;