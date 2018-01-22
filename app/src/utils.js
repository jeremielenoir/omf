import request from 'request';
import fs from 'fs';
import gm from 'gm';
import path from 'path';
import mime from 'mime';

import { Face, Stat } from './models';
import config from './config';

import s3bucket from './providers/aws';

const addStat = async(Lang) => {
  try{
    const stats = await Stat.find({ lang: Lang });
    if(stats.length == 0) {
      let newStat = new Stats();
      newStat.lang = Lang;
      newStat.count = 1;
      await newStat.save();
    }else{
      await Stats.findOneAndUpdate({ _id: stats[0]._id }, { $set: { count: stats[0].count + 1 } });

    }
  }catch(err) {
    console.log(err);
  }
};

/*const createUserFromTwitter = async(twitterUserData, number, done) => {
  if(twitterUserData.profile_image_url) {
    const imgDestPath = path.resolve( __dirname, '../public/img');
    /** REFACTOR
    try{
      const { body } = await request.get({ url: twitterUserData.profile_image_url.replace('_normal', ''), encoding: 'binary' });
      await fs.writeFile(`{$imgDestPath}/${twitterUserData.id}.jpeg`, body, 'binary');
      await s3bucket.createBucket();
      const stdout = await gm(`{$imgDestPath}/${twitterUserData.id}.jpeg`).resize('150', '150').stream();
      let buf = new Buffer('');
      let data = await stdout.on('data');
      buf = Buffer.concat([ buf, data ]);
      await stdout.on('end');
      let s3data = {
        Bucket: config.S3_BUCKET_NAME,
        ACL: 'public-read',
        Key: `img/${twitterUserData.id}.jpeg`,
        Body: buf,
        ContentType: mime.lookup(`${imgDestPath}/${twitterUserData.id}.jpeg`)
      };
      await s3bucket.putObject(s3data);
      const face = new Face();
      face.accountname = twitterUserData.name; // set the faces name (comes from the request)
      face.firstname = twitterUserData.screen_name; // set the faces name (comes from the request)
      face.lastname = twitterUserData.screen_name; // set the faces name (comes from the request)
      face.number = number; // set the faces name (comes from the request)
      face.picture = `/img/${twitterUserData.id}.jpeg`; // set the faces name (comes from the request)
      face.network = 'twitter'; // set the faces name (comes from the request)
      face.network_id = twitterUserData.id; // set the faces name (comes from the request)
      face.lang = twitterUserData.lang; // set the faces name (comes from the request)
      face.non_human = false; // set the faces name (comes from the request)
      addStat(face.lang);
      await face.save();
      if(done)
        done(null, face);

    }catch(err) {
      done(err, null);
    }
  }
};*/

const createUserFromTwitter = function createUserFromTwitter(twitterUserData, number, done){
    if(twitterUserData.profile_image_url){
      const imgDestPath = path.resolve( __dirname, '../public/img');
    /****************REFACTOR**********************/
    request.get({url: twitterUserData.profile_image_url.replace('_normal',''), encoding: 'binary'}, function (err, response, body) {
      fs.writeFile(imgDestPath + '/' + twitterUserData.id + '.jpeg', body, 'binary', function(errorFile) {
        s3bucket.createBucket(function() {
          gm(imgDestPath + '/' + twitterUserData.id + '.jpeg')
          .resize("150", "150")
          .stream(function(err, stdout, stderr) {
            /***/
            var buf = new Buffer('');
            if(stdout){
              stdout.on('data', function(data) {
                 buf = Buffer.concat([buf, data]);
              });
              stdout.on('end', function(data) {
                var data = {
                  Bucket: config.S3_BUCKET_NAME,
                  ACL: 'public-read',
                  Key: 'img/' + twitterUserData.id + '.jpeg',
                  Body: buf,
                  ContentType: mime.getType(imgDestPath + '/' + twitterUserData.id + '.jpeg')
                };


                s3bucket.putObject(data, function(errr, res) {
                    //console.log('CALLBACK AMAZON', errr, res);
                    if(errr){
                      console.log(errr);
                    }
                    else{
                      var face = new Face();
                      face.accountname = twitterUserData.name;  // set the faces name (comes from the request)
                      face.firstname = twitterUserData.screen_name;  // set the faces name (comes from the request)
                      face.lastname = twitterUserData.screen_name;  // set the faces name (comes from the request)
                      face.number = number;  // set the faces name (comes from the request)
                      face.picture = '/img/' + twitterUserData.id + '.jpeg';  // set the faces name (comes from the request)
                      face.network = 'twitter';  // set the faces name (comes from the request)
                      face.network_id = twitterUserData.id;  // set the faces name (comes from the request)
                      face.lang = twitterUserData.lang;  // set the faces name (comes from the request)
                      face.non_human = false;  // set the faces name (comes from the request)
                      //console.log('PROFILE TWITTER', twitterUserData.id);

                      //STATS
                      addStat(face.lang);

                      // save the face and check for errors
                        face.save(function(err) {
                            if (err){
                              console.log(err);
                            }

                        });

                        if(done){
                          return done(null, face);
                        }

                    }
                  });
                });
              }
              /***/
          });
        });
      });
    });
  }
};

const download = async(uri, filename, callback) => {
  request.head(uri, (err) => {
    if (err) callback(err, filename);
    let stream = request(uri);
    stream.pipe(fs.createWriteStream(filename).on('error', () => {
      callback(err, filename);
    })).on('close', () => {
      callback(null, filename);
    });
  });
};

const FaceHelper = {
  getPreviousFace: async(number, callback) => {
    try{
      const faces = await Face.find({ number: { $lt: number } }).limit(10).sort({ 'number': 'desc' } ).exec();
      callback(faces[0]);
    }catch(err) {
      console.log(err);
    }
  },
  getNextFace: async(number, callback) => {
    try{
      const faces = await Face.find({ number: { $gt: number } }).limit(10).sort({ 'number': 'desc' } ).exec();
      callback(faces[0]);
    }catch(err) {
      console.log(err);
    }
  }
};


export { createUserFromTwitter, addStat, download, FaceHelper };
