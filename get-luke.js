#! /usr/bin/env node

"use strict";
//import all the necessary modules
var invoke = require('invoke'),
  wget = require('wget-improved'),
  fs = require('fs'),
  tar = require('tar'),
  zlib = require('zlib'),
  replace = require('replace'),
  inquirer = require("inquirer"),
  exec = require('child_process').exec,
  instVbox = true,
  instVagr = true,
  instPip = true,
  instFabr = true,
  instFabU = true,
  projectName,
  st;

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

  projectName = answers.pName;
  invoke(function (data, callback) {
    
    console.log ('Checking dependencies:');
    exec("vboxmanage -v", function(error, stdout, stderr) {
      if (error !== null) {
          console.log('-Virtualbox will be installed');
      }
      else {
          console.log('-Virtualbox is already installed');
          instVbox = false;
      }
    });
    exec("vagrant --version", function(error, stdout, stderr) {
      if (stdout.indexOf('Vagrant 1.7') != -1){
        console.log('-Vagrant is already installed');
        instVagr = false;
      }
      else{
        console.log('-Vagrant will be updated');
      }
      if (error !== null) {
        console.log('-Vagrant will be installed');
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
    });
    setTimeout(callback, 2000);

  }).then(function (data, callback) {

    console.log('Installing Dependencies');
    if (!fs.existsSync('./tmp')){
      fs.mkdirSync('./tmp');
    }

    if (instVbox){
      console.log('Descargando virtualbox');
      var download = wget.download('http://download.virtualbox.org/virtualbox/5.0.0/virtualbox-5.0_5.0.0-101573~Ubuntu~trusty_amd64.deb', './tmp/vbox.deb');
      download.on('error', function(err) {
          console.log("Error downloading virtualbox: " + err);
      });
      download.on('end', function(output) {
        console.log('Instalando virtualbox');
        st = exec('sudo dpkg -i ./tmp/vbox.deb -y', function(error, stdout, stderr) {
          console.log(stdout);
        });
        st.on('close', function(){
          console.log('virtualbox installation finished');
          callback();
        });
      });
    }
    else{
      callback();
    }
    
  }).then(function (data, callback) {

    if (instPip){
      var download = wget.download('https://bootstrap.pypa.io/get-pip.py', './tmp/pip.py');
      download.on('error', function(err) {
          console.log("Error downloading pip: " + err);
      });
      download.on('end', function(output) {
        st = exec('sudo python ./tmp/pip.py', function(error, stdout, stderr) {
          console.log(stdout);
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
      var download = wget.download('https://dl.bintray.com/mitchellh/vagrant/vagrant_1.7.3_x86_64.deb', './tmp/vagrant.deb');
      download.on('error', function(err) {
          console.log("Error downloading vagrant: " + err);
      });
      download.on('end', function(output) {
        st = exec('sudo dpkg -i ./tmp/vagrant.deb -y', function(error, stdout, stderr) {
          console.log(stdout);
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
    st = exec('sudo apt-get -f install -y', function(error, stdout, stderr) {
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
    var download = wget.download('https://codeload.github.com/vinco/luke/tar.gz/master', './tmp/master.tar.gz');
    download.on('error', function(err) {
        console.log("Download error: " + err);
    });
    download.on('end', function(output) {
        console.log("Luke downloaded");
        callback();
    });

  }).then(function (data, callback) {
    console.log('Unpacking luke');
    fs.createReadStream('./tmp/master.tar.gz')
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
    st = exec('rm -rf ./tmp', function(error, stdout, stderr) {
          console.log(stdout);
          if (error !== null) {
            console.log('Could not remove temp files, error: ' + error);
          }
        });
        st.on('close', function(){
          callback();
        });
  }).end(null, function (data) {
    console.log('Project ready for execution')
  });
});
