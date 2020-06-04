const fs = require('fs-extra');
const util = require('util');
const request = require('request');
const date = require('date-and-time');
const config = require('../config/config.json'); //file with config


/* implement "random" into array and return rng value from given array = array.randomElement */
Array.prototype.randomElement = function () {
  return this[Math.floor(Math.random() * this.length)]
}

module.exports = {

  /* ASYNC write into file */
  fwASYNC: function (filepath, data) {
    fs.appendFile(filepath, data, null,
      // callback function
      function (err) {
        if (err) { throw err; }
      });
  },

  /* Logging - will show logs in console and write them into file (for later debugging?) */
  log: function (anything, type = "LOG") {
    //var now = dateFormat(new Date(), "dd.mm HH:MM:ss"); // 23.03 16:46:00
    var now = date.format(new Date(), 'DD.MM HH:mm:ss'); // 23.03 16:46:00
    var text = `${now} [${type}] ${util.inspect(anything)}`; //util.inspect - returns a string representation of an object
    console.log(text); // show log in console
    this.fwASYNC(config.logFile, text + "\n");// write log into file
  },

  /* Check if user has RIGHTs */
  hasRights: function (userID) {
    var admins = config.adminIDs.split(";");
    if (userID == config.ownerID || admins.includes(userID)) {
      return true;
    }
    return false;
  },

  /* Translate - load translated string from json */
  translate: function (string) {
    var language = require("../language/" + config.translation + ".json");
    var args = [language[`${string}`]];
    for (var i = 1; i < arguments.length; i++) {
      args.push(arguments[i]);
    }
    return util.format.apply(util, args);
  },

  /* Return only uniq values */
  uniq: function (a, key) {
    var seen = {};
    return a.filter(function (item) {
      var k = key(item);
      return seen.hasOwnProperty(k) ? false : (seen[k] = true);
    })
  },

  /* return array that contain only uniq nonempty values */
  uniqArr: function (array) {
    var filteredArray = array.filter(function (item, pos) {
      return array.indexOf(item) == pos;
    });
    return filteredArray.filter(Boolean);
  },

  /* return array that contain only nonempty strings */
  onlyStringArr: function (array) {
    return array.filter(e => typeof e === "string" && e !== "");
  },

  /* "waiting"/countdown function */
  startCountdown: function (seconds, functions = null) {
    var counter = seconds;
    var interval = setInterval(() => {
      console.log(counter);
      counter--;

      if (counter < 0) {
        clearInterval(interval);
        if (functions != null) {
          functions();
        }
      };
    }, 1000);
  },

  /* remove accents/diacritics */
  deunicode: function (any_string) {
    return any_string.normalize('NFD').replace(/[\u0300-\u036f]/g, "");
  },

  /* will return Boolean value if part of given string is somewhere in given array "a=>ab" "*/
  isItPartOfString: async function (any_array, any_string) {
    var ImBoolean = false;
    any_array.forEach(function (item) {
      if ((any_string.match(item))) {
        console.log(any_string + " | contain: " + item);
        ImBoolean = true;
      }
    });
    throw ImBoolean;
  },

  /*  return Boolean value, if given string is in array, identical value!  "a=>a" but not "a=>ab" */
  isItPartOfString_identical: async function (any_array, any_string) {
    var ImBoolean = false;
    any_array.forEach(function (item) {
      if (any_string === item) {
        ImBoolean = true;
      }
    });
    throw ImBoolean;
  },

  /* return random numbers from 0 (zero) to MAX */
  getRandomInt: function (count_of_possible_numbers) {
    if (count_of_possible_numbers <= 1) { // with "1" only output is 0, but with "2" => 0,1 is possible (2 = two possible numbers)
      count_of_possible_numbers = 2;
    }
    return Math.floor(Math.random() * Math.floor(count_of_possible_numbers));
  },

  /* parse strings with %s */
  parse: function (str, arg) {
    return str.replace(/%s/gi, arg);
  },

  /* read JSON and return results as object */
  JSON_file_read: function (filename) {
    var data;
    try {
      data = fs.readFileSync(filename, 'utf8').toString(); //read data
    } catch (err) {
      if (err.code === 'ENOENT') {
        console.log('File not found!');
        data = "{}"
      } else {
        throw err;
      }
    }
    return JSON.parse(data); //parse - create object
  },

  /* remove given element from JSON object */
  JSON_file_remove_element: function (filename, elem) {
    var obj = this.JSON_file_read(filename); //read data
    delete obj[`${elem}`]; // remove element
    fs.writeFileSync(filename, JSON.stringify(obj)); // write back to file
  },

  /* add or edit given element in JSON object */
  JSON_file_add_edit_element: function (filename, elem, data) {
    var obj = this.JSON_file_read(filename); //read data
    obj[`${elem}`] = data; // add/edit element
    fs.writeFileSync(filename, JSON.stringify(obj)); // write back to file
  },

  sortByDays: function (array) {
    var tmp = array.split("\n");
    var Monday = [];
    var Tuesday = [];
    var Wednesday = [];
    var Thursday = [];
    var Friday = [];
    var Saturday = [];
    var Sunday = [];

    tmp.forEach(function (item) {
      if (item.indexOf("Monday") > -1) {
        Monday.push(item + "\n");
      }
      if (item.indexOf("Tuesday") > -1) {
        Tuesday.push(item + "\n");
      }
      if (item.indexOf("Wednesday") > -1) {
        Wednesday.push(item + "\n");
      }
      if (item.indexOf("Thursday") > -1) {
        Thursday.push(item + "\n");
      }
      if (item.indexOf("Friday") > -1) {
        Friday.push(item + "\n");
      }
      if (item.indexOf("Saturday") > -1) {
        Saturday.push(item + "\n");
      }
      if (item.indexOf("Sunday") > -1) {
        Sunday.push(item + "\n");
      }
    });
    var finalString = Monday.concat(Tuesday, Wednesday, Thursday, Friday, Saturday, Sunday);// join
    return finalString.join("\n").replace(/^\n+/gm, "");//convert to string and remove unnecesary empty lines
  },

  /* code to restart bot */
  restart_program: function () {
    const execSync = require('child_process').execSync;
    execSync("start cmd.exe @cmd /k \"run_bot.cmd\"");
  },

  /* test if string start with value from array */
  startWithArr: function (string, array) {
    var value = false;
    array.forEach(function (key) {
      if (string[0] == key) {
        value = true;
      }
    });
    return value;
  },

  /* wait X-ms before executing rest of code */
  wait: function (ms) {
    var start = new Date().getTime();
    var end = start;
    while (end < start + ms) {
      end = new Date().getTime();
    }
  },

  download: function (url, destination) {
    request(url)
      .pipe(fs.createWriteStream(destination))
  }




}
