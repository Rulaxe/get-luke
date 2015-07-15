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
  , instVbox = true
  , instVagr = true
  , instPyth = true
  , instPip = true
  , instFabr = true
  , instFabU = true
  , projectName
  , st

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

    st = exec('sudo apt-get install python virtualbox gtk2-engines-pixbuf', function(error, stdout, stderr) {
      if (error !== null) {
        console.log('sudep installation error: ' + error);
      }
    });
    st.on('close', function(){
      callback();
    });

  }).then(function (data, callback) {
    
    console.log ('Checking dependencies:');
    exec("dpkg -l | sed 's_  _\t_g' | cut -f 2 | grep vagrant", function(error, stdout, stderr) {
      if (stdout.indexOf('vagrant') != -1){
        console.log('-Vagrant is already installed');
        instVagr = false;
      }
      else{
        console.log('-Vagrant will be installed');
      }
      if (error !== null) {
          console.log('exec error: ' + error);
      }
    });
    exec('python -c "help(' + "'modules'" + ')" | grep -w "pip"', function(error, stdout, stderr) {
      if (stdout.indexOf('pip') != -1){
        console.log('-Pip is already installed');
        instPip = false;
      }
      else{
        console.log('-Pip will be installed');
      }
      if (error !== null) {
          console.log('exec error: ' + error);
      }
    });
    exec('python -c "help(' + "'modules'" + ')" | grep "fab"', function(error, stdout, stderr) {
      if (stdout.indexOf('fabric') != -1){
        console.log('-Fabric is already installed');
        instFabr = false;
      }
      else{
        console.log('-Fabric will be installed');
      }
      if (stdout.indexOf('fabutils') != -1){
        console.log('-Fabutils is already installed');
        instFabU = false;
      }
      else{
        console.log('-Fabutils will be installed');
      }
      if (error !== null) {
          console.log('exec error: ' + error);
      }
    });
    setTimeout(callback, 2000);

  }).then(function (data, callback) {

    console.log('Installing Dependencies');

    if (instPip){
      var download = wget.download('https://bootstrap.pypa.io/get-pip.py', 'pip.py');
      download.on('error', function(err) {
          console.log("Error downloading pip: " + err);
      });
      download.on('end', function(output) {
        st = exec('python pip.py', function(error, stdout, stderr) {
          console.log(stdout);
          if (error !== null) {
            console.log('pip installation error: ' + error);
          }
        });
        st.on('close', function(){
          console.log('pip installation finished');
          callback();
        });
      });
    }
    else{
      callback();
    }

  }).and(function (data, callback) {
    
    if (instVagr){
      var download = wget.download('https://dl.bintray.com/mitchellh/vagrant/vagrant_1.7.3_x86_64.deb', 'vagrant.deb');
      download.on('error', function(err) {
          console.log("Error downloading vagrant: " + err);
      });
      download.on('end', function(output) {
        st = exec('sudo dpkg -i vagrant.deb', function(error, stdout, stderr) {
          console.log(stdout);
          if (error !== null) {
            console.log('vagrant installation error: ' + error);
          }
        });
        st.on('close', function(){
          console.log('vagrant installation finished');
          callback();
        });
      });
    }
    else{
      callback();
    }

  }).then(function (data, callback) {

    if (instFabr){
      st = exec('sudo pip install fabric', function(error, stdout, stderr) {
        console.log(stdout);
        if (error !== null) {
          console.log('fabric installation error: ' + error);
        }
      });
      st.on('close', function(){
        console.log('fabric installation finished');
        callback();
      });
    }
    else{
      callback();
    }

  }).then(function (data, callback) {

    if (instFabU){
      st = exec('sudo pip install vo-fabutils', function(error, stdout, stderr) {
        console.log(stdout);
        if (error !== null) {
          console.log('fabutils installation error: ' + error);
        }
      });
      st.on('close', function(){
        console.log('fabutils installation finished');
        callback();
      });
    }
    else{
      callback();
    }
  }).and(function (data, callback) {
    console.log('Installing unmet subdependencies')
    st = exec('sudo apt-get -f install', function(error, stdout, stderr) {
      console.log(stdout);
      if (error !== null) {
        console.log('sudep installation error: ' + error);
      }
    });
    st.on('close', function(){
      console.log('subdep installation finished');
      callback();
    });


  }).then(function (data, callback) {
    console.log('Downloading luke tarball')
    var download = wget.download('https://codeload.github.com/vinco/luke/tar.gz/master', 'master.tar.gz');
    download.on('error', function(err) {
        console.log("Download error: " + err);
    });
    download.on('end', function(output) {
        console.log("Luke downloaded");
        callback();
    });

  }).then(function (data, callback) {
    console.log('Unpacking luke');
    fs.createReadStream('master.tar.gz')
    .pipe(zlib.createGunzip())
    .pipe(tar.Extract({ path: projectName+"/", strip: 1}))
    .on('error', function(er) { console.log("Unpacking error: " + err) })
    .on("end", function() {
      console.log("Unpacking finished")
      callback();
    })

  }).then(function (data, callback) {
    console.log('Setting up the new project');
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