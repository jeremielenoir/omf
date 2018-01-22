import express from 'express'; // call express
import exphbs from 'express-handlebars';
import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import session from 'cookie-session';
import path from 'path';
import methodOverride from 'method-override';
import flash from 'connect-flash';
import Twitter from 'twitter';
import fbgraph from 'fbgraph';
import _ from 'underscore';
import mime from 'mime';
import auth from 'basic-auth';
import nodalytics from 'nodalytics';
import logger from 'morgan';
import gm from 'gm';
import os from 'os';
import mongoose from 'mongoose';

import { Face, Scrap, Stat } from './models';
import config from './config';
import routes from './routes'; // all define routes
import passport from './passport';
import { FaceHelper, download } from'./utils';
import s3bucket from './providers/aws'; // aws provider
import paypal from 'paypal-rest-sdk';

paypal.configure({
  'mode': 'sandbox', // sandbox or live
  'client_id': 'AWteQQRAdwx-D6RJs7sweRaikvOxhEy_q0jXH-mvGcfRDzfCcyFXNvcyxKdiIsgS-PIUmFQq5-tSXrzv',
  'client_secret': 'EK5ehTgK1jYk9FePoXRmmZAO09eHyGDqQ6ARU1k7nan9sEq-H3Zcbi7MI-dkDl2h1SJnY2UeVB_Ii4l6'
});

const imgDestPath = path.resolve('./public/img');
const publicPath = path.resolve('./public');
const app = express();

var admins = {
  'human': { password: 'human@123' }
};


// mongoDb connection
mongoose.connect(config.mongodb, { useMongoClient: true });

// express configuration
app.use(cors());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cookieParser());
app.use(methodOverride());
app.use(session({ secret: 'keyboard cat' }));
app.use(passport.initialize());
app.use(passport.session());
app.use(express.static(`${__dirname }/public`)); // set public folder to static >> but now host in amazon s3
app.use(flash());
app.use(nodalytics('UA-67692075-1'));
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  next();
});
if(process.env.NODE_ENV != 'production') // disable log for production
  app.use(logger('dev'));

/** *** HANDLEBARS HELPERS ******/

app.engine('handlebars',
  exphbs({
    partialsDir: [
      path.resolve(__dirname, 'views', 'partials')
    ],
    defaultLayout: path.resolve(__dirname, 'views', 'layouts', 'main'),
    helpers: {
      'checked': (search, list) => {
        if(list) {
          var listTab = JSON.parse(list);
          return _.contains(listTab, search, 0) ? 'checked="true"' : '';
        }
        return '';


      },
      'json': (context) => {
        return JSON.stringify(context);
      },
      ifCond: (v1, operator, v2, options) => {
        switch (operator) {
          case '==':
            return (v1 == v2) ? options.fn(this) : options.inverse(this);

          case '!=':
            return (v1 != v2) ? options.fn(this) : options.inverse(this);

          case '===':
            return (v1 === v2) ? options.fn(this) : options.inverse(this);

          case '!==':
            return (v1 !== v2) ? options.fn(this) : options.inverse(this);

          case '&&':
            return (v1 && v2) ? options.fn(this) : options.inverse(this);

          case '||':
            return (v1 || v2) ? options.fn(this) : options.inverse(this);

          case '<':
            return (v1 < v2) ? options.fn(this) : options.inverse(this);

          case '<=':
            return (v1 <= v2) ? options.fn(this) : options.inverse(this);

          case '>':
            return (v1 > v2) ? options.fn(this) : options.inverse(this);

          case '>=':
            return (v1 >= v2) ? options.fn(this) : options.inverse(this);
        }
      }
    }

  }));
app.set('views', path.resolve(__dirname, 'views'));
app.set('view engine', 'handlebars');

// ====================== node paypal sdk sample ============================ //

app.get('/payment', (req, res) => res.render('payment'));

app.post('/pay', (req, res) => {
  const fullUrl = `${req.protocol }://${ req.get('host')}`;
  const create_payment_json = {
    'intent': 'sale',
    'payer': {
      'payment_method': 'paypal'
    },
    'redirect_urls': {
      'return_url': `${fullUrl}/success-payment`,
      'cancel_url': `${fullUrl}/cancel-payment`
    },
    'transactions': [ {
      'item_list': {
        'items': [ {
          'name': 'Blue hat',
          'sku': '003',
          'price': '2.00',
          'currency': 'EUR',
          'quantity': 1
        } ]
      },
      'amount': {
        'currency': 'EUR',
        'total': '2.00'
      },
      'description': 'Hat for the best team ever'
    } ]
  };
  paypal.payment.create(create_payment_json, (error, payment) => {
    if (error) {
      throw error;
    } else {
      for(let i = 0;i < payment.links.length;i++) {
        if(payment.links[i].rel === 'approval_url') {
          res.redirect(payment.links[i].href);
        }
      }
    }
  });

});

app.get('/success-payment', (req, res) => {
  const payerId = req.query.PayerID;
  const paymentId = req.query.paymentId;

  const execute_payment_json = {
    'payer_id': payerId,
    'transactions': [ {
      'amount': {
        'currency': 'EUR',
        'total': '2.00'
      }
    } ]
  };

  paypal.payment.execute(paymentId, execute_payment_json, (error, payment) => {
    if (error) {
      console.log(error.response);
      throw error;
    } else {
      console.log(JSON.stringify(payment));
      res.redirect('/');
    }
  });
});

app.get('/cancel-payment', (req, res) => res.send('Cancelled'));

// ROUTES FOR OUR API
// =============================================================================
var publicRouter = express.Router();

// root route (accessed at GET http://localhost:3000)
publicRouter.get('/', (req, res) => {
  res.render('home', { data: { 'config': config, 'currentUser': req.user } });
});


publicRouter.get('/put_to_scrap/:number', (req, res, next) => {
  Face.findOne({ 'number': req.params.number }, (err, face) => {
    face.claim = false;
    face.save((err) => {
      console.log('ERREUR', err);
    });

  });

  Face.find((err, faces) => {
    if (err) {
      res.send(err);
    }
    res.render('register', { 'faces': faces, 'nbFaces': (faces.length + 1) });

  });

});


publicRouter.get('/moderate/:offset', (req, res, next) => {

  var currentOffset = req.params.offset ? parseInt(req.params.offset, 10) : 0;

  Face.find().skip(req.params.offset).limit(1000).exec((err, faces) => {
    if (err) {
      res.send(err);
    }
    res.render('register', { 'next': currentOffset + 1000, 'config': config, 'previous': currentOffset - 1000, 'faces': faces, 'nbFaces': (faces.length + 1) });
  });

});


publicRouter.get('/register', (req, res, next) => {
  Face.find((err, faces) => {
    if (err) {
      console.log('ERROR', err);
      res.send(err);
    }
    res.render('register', { 'faces': faces, 'nbFaces': (faces.length + 1), currentUser: req.user });
  });
});


publicRouter.get('/claim/:id', (req, res, next) => {

  Face.findOne({ 'accountname': req.user.accountname }, (err, face) => {
    if (err) {
      console.log('UTILISATEUR NON TROUVE', err);
    }else if(req.user.accountname != req.params.id) {
      res.render('home', { data: { 'config': config, 'error': 'Account name does not match. Sorry' } });
    }else{
      face.claim = true;
      face.save((err) => {
        if (err) {
          console.log('ERROR SAVE NUMBER', err);
        }
        res.render('home', { data: { 'config': config, 'editedFace': face, 'currentUser': req.user, 'claim': true } });

      });
    }
  });

});

publicRouter.get('/decline/:id', (req, res, next) => {

  Face.findOne({ 'accountname': req.user.accountname }, (err, face) => {
    if (err) {
      console.log('UTILISATEUR NON TROUVE', err);
    }else if(req.user.accountname != req.params.id) {
      res.render('home', { data: { 'config': config, 'error': 'Account name does not match. Sorry' } });
    }else{
      Face.remove({
        accountname: req.params.id
      }, (err, face) => {
        if (err) {
          res.send(err);
        }else{
          res.render('home', { data: { 'config': config, 'decline': true, 'declineFace': req.params.id } });
        }
      });

    }

  });

});


publicRouter.get('/success/:id', (req, res, next) => {

  Face.findOne({ '_id': req.user._id }, (err, face) => {
    if (err) {
      console.log('UTILISATEUR NON TROUVE', err);
    }else{
      if(!face.number) {
        face.number = req.params.id == 0 ? 1 : req.params.id;
        req.user.number = req.params.id == 0 ? 1 : req.params.id;
        face.number_id = parseInt(face.number, 10) - 1;
      }

      console.log('FACEHELPER', FaceHelper);
      FaceHelper.getPreviousFace(face.number, (previousFace) => {

        FaceHelper.getNextFace(face.number, (nextFace) => {
          face.previous = previousFace.number;
          face.next = nextFace.number;

          Face.findOneAndUpdate({ _id: previousFace._id }, { $set: { next: face.number } }, {}, (err) => {
            // console.log('ERREUR', err);

          });
          Face.findOneAndUpdate({ _id: nextFace._id }, { $set: { previous: face.number } }, {}, (err) => {
            // console.log('ERREUR', err);
          });

          face.save((err) => {
            if (err) {
              console.log('ERROR SAVE NUMBER', err);
            }
            res.redirect('/#success/');

          });
        });

      });


    }

  });

});

/** *** EDIT PART *******/
publicRouter.get('/edit/:number', (req, res, next) => {

  Face.findOne({ 'number': req.params.number }, (err, face) => {
    if (err) {
      res.send(err);
    }
    if(face.number == req.user.number) {
      res.render('home', { data: { 'config': config, 'editedFace': face, 'currentUser': req.user } });
    }else{
      res.send(err);
    }

  });
});


var getImagesForMozaic = function(number, callback) {

  Face.findOne({ 'number': number }, (err, face) => {
    if (err) {
      res.send(err);
    }

    download(`http://files.onemillionhumans.com${ face.picture}`, publicPath + face.picture, (errDownload, filename) => {
      if(!errDownload) {
        callback(null, face);
      }
    });

  });

};

var createFindImage = function(number, face, callback) {
  var im = gm;

  gm()
    .command('composite')
    .in('-gravity', 'Center')
    .in(publicPath + face.picture)
    .in(`${imgDestPath }/human_share.jpg`)
    .write(`${imgDestPath }/${ number }-temp.png`, (err2) => {
      var imgFinalMozaic = im(`${imgDestPath }/${ number }-temp.png`);
      console.log('FACE IMAGE', face);

      // imgFinalMozaic.crop(450, 236, 0, 107);
      imgFinalMozaic.stream((err, stdout, stderr) => {

        console.log('STREAM');

        var buf = new Buffer('');

        if(stdout) {

          stdout.on('data', (data) => {
            buf = Buffer.concat([ buf, data ]);
          });

          stdout.on('end', (data) => {
            console.log('END STREAM');
            var data = {
              Bucket: config.S3_BUCKET_NAME,
              ACL: 'public-read',
              Key: `img/mozaic/${ number }-mozaic.png`,
              Body: buf,
              ContentType: mime.lookup(`${imgDestPath }/${ number }-temp.png`)
            };

            s3bucket.putObject(data, (errr, ress) => {

              if(errr) {
                console.log(errr);
                callback(errr, null);
              } else{
                callback(null, `${imgDestPath }/${ number }-temp.png`);
              }
            });
          });
        }
      });

    });

};

publicRouter.get('/number/:number', (req, res, next) => {
  console.log('get /number');
  /** *** IMAGE manipulation *****/
  var number = parseInt(req.params.number, 10);
  getImagesForMozaic(number, (err, image) => {

    console.log('IMAGE NUMBER', image);

    createFindImage(number, image, (err1) => {

      Face.findOne({ 'number': req.params.number }, (err, face) => {
        if (err) {
          res.send(err);
        }
        // res.send('test');
        res.render('home', { data: { 'config': config, 'showFace': face, 'currentUser': req.user } });
      });
    });

  });

});


publicRouter.get('/error', (req, res, next) => {
  var errors = req.flash();
  res.render('home', { data: { 'config': config, 'error': errors.error[0] } });
});

publicRouter.get('/share/:number', (req, res, next) => {
  res.render('share', { data: { 'config': config, 'number': req.params.number } });
});

app.use((req, res, next) => {
  config.root_url = `${req.protocol }://${ req.get('host')}`;
  config.assets_url = `${req.protocol }://files.${ req.get('host')}`;
  return next();
});
// basic auth
if(config.need_auth) {
  app.use((req, res, next) => {

    var user = auth(req);
    if (!user || !admins[user.name] || admins[user.name].password !== user.pass) {
      res.set('WWW-Authenticate', 'Basic realm="example"');
      return res.status(401).send();
    }
    return next();
  });
}


app.use(routes);
app.use('/', publicRouter);

export default app;
