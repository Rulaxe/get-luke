#! /usr/bin/env node

"use strict";
//import all the necessary modules
var invoke = require('invoke')
  , wget = require('wget-improved')
  , fs = require('fs')
  , tar = require('tar')
  , zlib = require('zlib')
  , replace = require('replace')
  , inquirer = require("inquirer")
  , exec = require('child_process').exec
  , projectName

//this method uses replace module receiving 3 parameters
function repFile(file, inString, outString) {
  replace({
    regex: inString,
    replacement: outString,
    paths: [file,],
    recursive: true,
    silent: true,
   })
}

//Inquirer questions
var questions = [
  {
    type: "input",
    name: "pName",
    message: "Type the name for your new project:"
  }
];


//main method for deploying the new luke project.
inquirer.prompt(questions, function (answers) {

  projectName = answers.pName
  invoke(function (data, callback) {
    var download = wget.download('https://codeload.github.com/vinco/luke/tar.gz/master', 'master.tar.gz');
    download.on('error', function(err) {
        console.log("Download error: " + err);
    });
    download.on('end', function(output) {
        console.log(output + " downloaded");
    });
    var dlvag = wget.download('https://dl.bintray.com/mitchellh/vagrant/vagrant_1.7.3_x86_64.deb', 'vagrant.deb');
    dlvag.on('error', function(err) {
        console.log("Download vagrant error: " + err);
    });
    dlvag.on('end', function(output) {
        console.log(output + " downloaded");
        exec('sudo dpkg -i vagrant.deb', function(error, stdout, stderr) {
            console.log('stdout: ' + stdout);
            console.log('stderr: ' + stderr);
            if (error !== null) {
                console.log('exec error: ' + error);
            }
        });
    });
    exec('sudo apt-get install python', function(error, stdout, stderr) {
        console.log('stdout: ' + stdout);
        console.log('stderr: ' + stderr);
        if (error !== null) {
            console.log('exec error: ' + error);
        }
    });
    setTimeout(callback, 3000)

  }).then(function (data, callback) {
    exec('sudo apt-get install virtualbox', function(error, stdout, stderr) {
        console.log('stdout: ' + stdout);
        console.log('stderr: ' + stderr);
        if (error !== null) {
            console.log('exec error: ' + error);
        }
    });
    setTimeout(callback, 2000)

  }).then(function (data, callback) {
    fs.createReadStream('master.tar.gz')
    .pipe(zlib.createGunzip())
    .pipe(tar.Extract({ path: projectName+"/", strip: 1}))
    .on('error', function(er) { console.log("Unpacking error: " + err) })
    .on("end", function() { console.log("Unpacking finished") })
    setTimeout(callback, 2000)

  }).then(function (data, callback) {
    var setFile = projectName+"/environments.json",
      fabFile = projectName+"/fabfile.py",
      provFile = projectName+"/provision/provision.sh",
      envSettings = projectName + ".settings.devel",
      oldCreateDb = "createdb luke",
      newCreateDb = "createdb " + projectName,
      oldDropDb = "dropdb luke",
      newDropDb = "dropdb " + projectName,
      provProjName = "PROJECT_NAME=" + projectName

    repFile(setFile, 'luke.settings.devel', envSettings);

    repFile(fabFile, oldCreateDb, newCreateDb);

    repFile(fabFile, oldDropDb, newDropDb);

    repFile(provFile, 'PROJECT_NAME=luke', provProjName);
    callback()

  }).then(function (data, callback) {
    fs.unlinkSync('master.tar.gz')
    callback()
  }).end(null, function (data) {
    console.log('Project ready for execution')
  });
});