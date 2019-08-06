/* LIBS */
const util = require('util');
const dateFormat = require('dateformat');
const CronJob = require('cron').CronJob;
const Discord = require('discord.js'); // Load up the discord.js library
const client = new Discord.Client();
const https = require('https');
const http = require('http');
const fs = require('fs');
const request = require("request");
const path = require('path');
const logFile = "logs.txt";
const announceFile = "announce.json";
const announceFileFIN = "announceFIN.json";
const common_learning = "common_learning.txt";
const start_time = Date.now();

/**************************************************************************/

/* Check for necessary files */
const obj = require('../data/check.json');
Object.keys(obj).forEach(function (key) {
    if (fs.existsSync(obj[key])) {
        Log(key + " OK.");
    } else {
        Log(key + " cannot be found.");
        process.exit(1);
    }
});

/* Loading files & other file related stuff */
const config = require('../data/config.json'); //file with config
const data_file = require('../data/anime.json'); //file with names and times
const reply = require('../data/replies.json'); //bot replies
fs.appendFileSync(announceFile, ""); //create empty file for announcements
fs.appendFileSync(announceFileFIN, ""); //create empty file for finished announcements
/**************************************************************************/

/* CONSTs & VARs (Random vars that i will need later...or never) */
const one_week = Number(604800000); // 7days in miliseconds (7 * 24 * 60 * 60 * 1000)
const ms_per_day = Number(86400000); // miliseconds per day 1000 * 60 * 60 * 24;
const updCMD = "start cmd.exe @cmd /k \"git reset --hard & git fetch --all & git pull & exit\"";
var todayArray;
var soonArray = new Array();
var soonArrays = new Array();
var page_protocol = https;
var LastPoliteMessage = 0;
var LastVoiceChannelMessageJ = 0;
var LastVoiceChannelMessageL = 0;

var timeShift = config.timeshift;
var checkXminutes = config.checkXminutes;
var checkTimeOut = config.checkTimeOut * 1000;
var bot_name_img_chance = parseInt(config.bot_img_chance);
var show_more_than_week = config.show_more_than_week;
var slice_by_chars = config.slice_name_by_chars;
var defaultTextChannel = config.defaultTextChannel;

var polite_array_day = reply.messages_day.split(";");
var polite_array_night = reply.messages_night.split(";");
var polite_array_hello = reply.polite_hello.split(";");
var polite_array_bye = reply.polite_night.split(";");
var polite_array_exceptions = reply.exceptions.split(";");
var voice_join = reply.voice_join_msg.split(";");
var voice_leave = reply.voice_leave_msg.split(";");
var bot_name_txt = reply.text_replies.split(";");
var bot_name_img = reply.image_replies.split(";");
var pathToImages = "images";
var imagesInFolder = [];
fs.readdir(pathToImages, function (err, items) {
    for (var i = 0; i < items.length; i++) {
        var file = pathToImages + '/' + items[i];
        imagesInFolder.push(file);
    }
});
/**************************************************************************/

/* FUNCTIONS */

function fwASYNC(filepath, data, options = null) {
    fs.appendFile(filepath, data, options,
        // callback function
        function (err) {
            if (err) { throw err; }
        });
}

function fwSYNC(filepath, data, options = null) {
    fs.appendFileSync(filepath, data, options);
}

/* Logging - will show logs in console and write them into file (for later debugging?) */
function Log(any_string, /**/) {
    var now = dateFormat(new Date(), "dd.mm HH:MM:ss"); // 23.03 16:46:00
    var text = `${now} [LOG] ${util.inspect(any_string)}`;
    console.log(text); // show log in console
    fwASYNC(logFile, text + "\n");// write log into file
}

/* Translate - load translated string from json */
function translate(any_string, /**/) {
    var language = require("../language/" + config.translation + ".json");
    var args = [language[`${any_string}`]];
    for (var i = 1; i < arguments.length; i++) {
        args.push(arguments[i]);
    }
    return util.format.apply(util, args);
}

/* OUTPUT count of weeks from given date to present day */
function weeksCOUNTER(real_date, weeks = 0) {
    var week_date = new Date(real_date).getTime(); //convert date to readable form (for computer :D)
    if (week_date < new Date().getTime()) { //if is given date still "smaller" than "today date", 
        var real_date2 = week_date + one_week; // add "one week" and run function again and increment week
        return weeksCOUNTER(real_date2, weeks += 1) //recursion
    }
    return weeks;
}

/* OUTPUT number of days between two given dates */
function dateDiffInDays(a, b) { // a and b must be Date objects
    // Discard the time and time-zone information.
    var utc1 = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
    var utc2 = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
    return Math.floor((utc2 - utc1) / ms_per_day);
}

/* Return only uniq values */
const uniq = (a, key) => {
    var seen = {};
    return a.filter(function (item) {
        var k = key(item);
        return seen.hasOwnProperty(k) ? false : (seen[k] = true);
    })
}

/* return array that contain only nonempty strings */
function onlyStringArr(array) {
    return array.filter(e => typeof e === "string" && e !== "");
}

/* return array that contain only uniq nonempty values */
function uniqArr(array) {
    var filteredArray = array.filter(function (item, pos) {
        return array.indexOf(item) == pos;
    });
    return filteredArray.filter(Boolean);
}

/* "waiting" function */
function sleep(millis) {
    return new Promise(resolve => setTimeout(resolve, millis));
}

/* remove accents/diacritics */
function deunicode(any_string) {
    return any_string.normalize('NFD').replace(/[\u0300-\u036f]/g, "");
}

/* will return Boolean value if part of given string is somewhere in given array */
async function isItPartOfString(any_array, any_string) {
    var ImBoolean = false;
    any_array.forEach(function (item) {
        if ((any_string.match(item))) {
            ImBoolean = true;
        }
    });
    throw ImBoolean;
}

/*  return if given string is in array */
async function isItPartOfString2(any_array, any_string) {
    var ImBoolean = false;
    any_array.forEach(function (item) {
        if (any_string === item) {
            ImBoolean = true;
        }
    });
    throw ImBoolean;
}

/* Check if user has RIGHTs */
function hasRights(userID) {
    var admins = config.adminIDs.split(";");
    if (userID == config.ownerID || admins.includes(userID)) {
        return true;
    }
    return false;
}

/* return random numbers from 0 (zero) to MAX */
function getRandomInt(max) {
    return Math.floor(Math.random() * Math.floor(max));
}

/* parse strings with %s */
function parse(str, arg) {
    return str.replace(/%s/gi, arg);
}

/* sort output list by days */
function sortByDays(array) {
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
}

/* implement "random" into array and return rng value from given array = array.randomElement */
Array.prototype.randomElement = function () {
    return this[Math.floor(Math.random() * this.length)]
}

/* gogoanime check */
function gogoanime(url) {
    return new Promise(resolve => {
        request({
            uri: url,
        }, function (error, response, body) {
            if (body === undefined || body === null) {
                resolve(false);
            } else {
                resolve(!body.includes('Page not found'));
            }
        });
    });
}

/**************************************************************************/

/* Discord.js based functions */

/* Remove invoking message */
function removeCallMsg(message) {
    message.delete().catch(error => Log(translate("BOT_removeCallMsg_err")));
}

/* Send and remove message in X seconds */
function selfDestructMSG(message, MSGText, time, cmd_name) {
    message.channel.send(MSGText).then(sentMessage => {
        sentMessage.delete(time).catch(error => Log(translate("BOT_send_selfdestruct_err")));
    });
    Log(translate("BOT_send_selfdestruct", message.author.username.toString(), cmd_name));
}

/* Send and remove message in X seconds (from given channel)*/
function selfDestructMSGID(channelID, MSGText, time, user = null, cmd_name) {
    client.channels.get(channelID).send(MSGText).then(sentMessage => {
        sentMessage.delete(time).catch(error => Log(translate("BOT_send_selfdestruct_err")));
    });
    Log(translate("BOT_send_selfdestructid", user, cmd_name));
}

/* Send message to all servers (guilds) bot is in */
function SendtoAllGuilds(text, picture = null) {
    try {
        let toSay = text;
        client.guilds.map((guild) => {
            let found = 0
            guild.channels.map((c) => {
                if (found === 0 & c.type === "text" &
                    c.permissionsFor(client.user).has("VIEW_CHANNEL") === true &
                    c.permissionsFor(client.user).has("SEND_MESSAGES") === true) {
                    if (picture) {
                        c.send(toSay, {
                            files: [
                                picture
                            ]
                        });
                    } else {
                        c.send(toSay);
                    }
                    found = 1;
                }
            });
        });
        Log(translate("BOT_send_all"));
    }
    catch (err) {
        Log(translate("BOT_could_not_send"));
    }
}

/* EVERYTHING */
function AnimeTimer(message = null, textoutput = false) {
    var obj = data_file; //anime
    var zero_dayHeader = "```fix\nToday:```\n";
    var zero_day = "";
    var one_dayHeader = "\n```fix\nOne Day:```\n";
    var one_day = "";
    var two_daysHeader = "\n```fix\nTwo Days:```\n";
    var two_days = "";
    var less_than_weekHeader = "\n```fix\nLess than week:```\n";
    var less_than_week = "";
    var oth_days = "\n```fix\nLater:```\n";

    var anime_in_array = [];
    var TMPtodayArray = [];
    for (var i in obj) {
        var valueToPush = {};
        valueToPush.name = i;
        valueToPush.year = obj[i]["year"];
        valueToPush.month = obj[i]["month"];
        valueToPush.day = obj[i]["day"];
        valueToPush.hour = Number(obj[i]["hour"]) + Number(timeShift);
        valueToPush.minute = obj[i]["minute"];
        if (obj[i]["link"]) {
            valueToPush.link = obj[i]["link"];
            valueToPush.starting_episode = obj[i]["_starting_episode"] - obj[i]["_skipped_episodes"];
            valueToPush.last_episode = obj[i]["_last_episode"];
        }
        if (obj[i]["picture"]) {
            valueToPush.picture = obj[i]["picture"];
        }
        if (obj[i]["checkTo"]) {
            valueToPush.checkTo = obj[i]["checkTo"];
        }
        anime_in_array.push(valueToPush);
    }

    anime_in_array.forEach(function (item) {
        if (item.year) {
            var json_date = new Date(item.year, (item.month - 1), item.day, item.hour, item.minute, 0, 0);
            var weeks = weeksCOUNTER(json_date);
            var CDNext = new Date(json_date.getTime() + (one_week * weeks));
            const a = new Date(), b = CDNext, difference = dateDiffInDays(a, b);
            countDownDate = dateFormat(json_date.getTime() + (one_week * weeks), "dddd, dS, HH:MM"); /* Saturday, 9th, 16:46 */
            countDownDate_oth = dateFormat(json_date.getTime() + (one_week * weeks), "dddd, dS mmmm, HH:MM"); /* Saturday, 9th April, 16:46 */
            if (parseInt(item.last_episode) >= (parseInt(item.starting_episode) + parseInt(weeks))) {
                var cd_text = `**${item.name}**: ` + countDownDate + " [`ep" + `${parseInt(item.starting_episode) + parseInt(weeks)}` + "`]\n";
                var cd_text_oth = `**${item.name}**: ` + countDownDate_oth + " [`ep" + `${parseInt(item.starting_episode) + parseInt(weeks)}` + "`]\n";
                switch (true) {
                    case (difference == 0):
                        zero_day = zero_day + cd_text;
                        if (item.link) {
                            var eps = parseInt(item.starting_episode) + parseInt(weeks);
                            if (item.checkTo) {
                                TMPtodayArray.push([item.name, CDNext.getTime(), parse(item.link, eps), item.picture, parse(item.checkTo, eps)]);
                            } else {
                                TMPtodayArray.push([item.name, CDNext.getTime(), parse(item.link, eps), item.picture, parse(item.link, eps)]);
                            }
                            Log(translate("upcoming_check", item.name, parse(item.link, parseInt(item.starting_episode) + parseInt(weeks))));
                        }
                        break;
                    case (difference == 1):
                        one_day = one_day + cd_text;
                        break;
                    case (difference == 2):
                        two_days = two_days + cd_text;
                        break;
                    case (difference >= 3 && difference <= 7):
                        less_than_week = less_than_week + cd_text;
                        break;
                    default:
                        oth_days = oth_days + cd_text_oth;
                }
            }
        }
    });
    todayArray = TMPtodayArray;

    if (zero_day.length > 1) {
        zero_day = zero_dayHeader + sortByDays(zero_day);
    }
    if (one_day.length > 1) {
        one_day = one_dayHeader + sortByDays(one_day);
    }
    if (two_days.length > 1) {
        two_days = two_daysHeader + sortByDays(two_days);
    }
    if (less_than_week.length > 1) {
        less_than_week = less_than_weekHeader + sortByDays(less_than_week);
    }

    if (textoutput) {
        if (show_more_than_week) {
            selfDestructMSG(message, zero_day + one_day + two_days + less_than_week + oth_days, 30000, "AnimeTable");
        } else {
            selfDestructMSG(message, zero_day + one_day + two_days + less_than_week, 30000, "AnimeTable");
        }

    } else {
        /* write data into file for later use */
        data = todayArray.join(";\n");
        if (fs.readFileSync(announceFile) != "") {
            if (!fs.readFileSync(announceFile).toString().includes(data)) {
                fs.appendFileSync(announceFile, ";\n" + data); // if file is not empty add semicolon at end
            }
        } else {
            fs.appendFileSync(announceFile, data);
        }
    }
}

/* Put "today" animes into array for later use */
function timeCalcMessage() {
    AnimeTimer(null, false);
    var todayArrayFromFile = fs.readFileSync(announceFile); // read from file
    todayArrayFromFile = uniqArr(todayArrayFromFile.toString().split(";\n")); //make array again

    todayArrayFromFile.forEach(function (item) {
        item = item.split(",");
        if (item[2]) {
            var valueToPush = {};
            valueToPush.name = item[0];
            valueToPush.time = item[1];
            valueToPush.url = item[2];
            valueToPush.picture = item[3];
            valueToPush.checkTo = item[4];
            soonArrays.push(valueToPush);
            valueToPush = {};
        }
        soonArrays.forEach(function (itemz) {
            soonArray.push(itemz);
        })
        soonArray = uniq(soonArray, JSON.stringify);
    });
}

/* check "today" animes for existance */
function CheckAnimeOnNet() {
    if (typeof soonArray != "undefined") {
        soonArray.forEach(function (item) {
            var tmpCHECKVAR = null;
            if (typeof (item.checkTo) == 'string') {
                tmpCHECKVAR = item.checkTo;
            } else {
                tmpCHECKVAR = item.url;
            }

            /*if (tmpCHECKVAR.substring(0, 5) != "https") {
                page_protocol = http; // if protocol is not https, change it to http
            } else {
                page_protocol = https;
            }*/

            gogoanime(tmpCHECKVAR).then(data => {
                if (data) {
                    Log(translate("BOT_cron_link_yes", tmpCHECKVAR));
                    if (item.url == tmpCHECKVAR) {
                        console.log(item.url + `\n` + tmpCHECKVAR);
                        var messages = "```fix\n" + item.name + "```\n" + `<${item.url}>\n`;
                    } else {
                        var messages = "```fix\n" + item.name + "```\n" + `<${tmpCHECKVAR}>\n` + `or\n<${item.url}>\n`;
                    }
                    var index = soonArray.indexOf(item);
                    Log(translate("BOT_deleting", JSON.stringify(soonArray[index])));
                    delete soonArray[index];
                    ///////////////////////////////////////////////////
                    var str_name = `^(` + item.name + `).*`;
                    var regexx = new RegExp(str_name, "igm");
                    var data = fs.readFileSync(announceFile).toString();
                    var newvalue = data.replace(regexx, "");
                    fs.writeFileSync(announceFile, newvalue);
                    ////////////////////////////////////////////////////
                    var alreadyDONE = fs.readFileSync(announceFileFIN).toString();
                    if (alreadyDONE.indexOf(item.url) == -1) {
                        if (item.picture) {
                            SendtoAllGuilds(messages, item.picture);
                        } else {
                            SendtoAllGuilds(messages);
                        }
                        fwASYNC(announceFileFIN, item.url + " \n");
                    }
                } else {
                    Log(translate("BOT_cron_link_no", item.name, item.url, tmpCHECKVAR));
                }
            });
        });
    }
}

/**************************************************************************/

/* STARTUP THINGS */

/* This event will run if the bot starts, and logs into channel, successfully */
client.on("ready", () => {
    Log(translate("BOT_on_ready", client.users.size, client.channels.size, client.guilds.size));

    //set bot status
    client.user.setPresence({
        game: {
            name: config.activityName,
            type: config.activityType
        }
    }).then(presence => Log(translate("BOT_set_activity", config.activityType, config.activityName)))
        .catch(console.error);

    //recalculate timers
    timeCalcMessage();

    /* CRON1 ***********************************************************/
    // check every X minutes if anime is there
    const job1 = new CronJob(`*/${checkXminutes} * * * *`, function () {
        CheckAnimeOnNet();
    });
    job1.start();
    Log(translate("cron_started", 1));
    const job2 = new CronJob("1 0 * * *", function () {
        timeCalcMessage();
    });
    job2.start();
    Log(translate("cron_started", 2));
});



/* Triggered when addeded/removed from server */
client.on("guildCreate", guild => {
    Log(translate("BOT_on_guildCreate", guild.name, guild.id, guild.memberCount));
    client.user.setActivity(translate("BOT_serving", client.guilds.size));
});
client.on("guildDelete", guild => {
    Log(translate("BOT_on_guildDelete", guild.name, guild.id));
    client.user.setActivity(translate("BOT_serving", client.guilds.size));
});

/* Error handling (dull one) - wait X miliseconds and restart - helps on network interupts */
client.on("error", (e) => {
    Log(e);
    sleep(5000);
    const execSync = require('child_process').execSync;
    execSync("start cmd.exe @cmd /k \"run_bot.cmd\"");
});

/* Triggered when user join/leave voice channel */
client.on("voiceStateUpdate", (oldMember, newMember) => {
    let newUserChannel = newMember.voiceChannel;
    let oldUserChannel = oldMember.voiceChannel;

    if (!newMember.user.bot || !oldMember.user.bot) { // bot protection
        if (oldUserChannel === undefined && newUserChannel !== undefined) {
            // User Joins a voice channel
            if ((parseInt(new Date().getTime()) - parseInt(LastVoiceChannelMessageJ)) > 60000 && Boolean(getRandomInt(2)) == true) { //prevent spamming on join/leave!!
                LastVoiceChannelMessageJ = new Date().getTime();
                selfDestructMSGID(defaultTextChannel, translate("voice_join", voice_join.randomElement()), 20000, newMember.user.username.toString(), "userJoinVoice");//send message and remove if after X seconds
            }
            Log(translate("voice_join_log", newMember.user.username.toString()));
        } else if (newUserChannel === undefined) {
            // User leaves a voice channel
            if ((parseInt(new Date().getTime()) - parseInt(LastVoiceChannelMessageL)) > 60000 && Boolean(getRandomInt(2)) == true) { //prevent spamming on join/leave!!
                LastVoiceChannelMessageL = new Date().getTime();
                selfDestructMSGID(defaultTextChannel, translate("voice_leave", voice_leave.randomElement()), 20000, oldMember.user.username.toString(), "userLeaveVoice");//send message and remove if after X seconds
            }
            Log(translate("voice_leave_log", oldMember.user.username.toString()));
        }
    }
})

/* Triggered when message is send into chat */
client.on("message", async message => {
    if (message.author.bot) return; // ignore other bots and self

    /* Polite hello/bye */
    if (config.polite) {
        if ((parseInt(new Date().getTime()) - parseInt(LastPoliteMessage)) > 20000) { //prevent spamming channel with hello to hello to hello...HELL NO!!
            LastPoliteMessage = new Date().getTime();
            var message_string = deunicode(message.content).toLowerCase().split(" ")[0];
            var message_string2 = deunicode(message.content).toLowerCase().split(" ")[1];// if greeting message has 2 parts (good morning...)
            var posted = false;

            isItPartOfString(polite_array_exceptions, message_string).catch(function (exception) {
                if (!exception) {
                    // good morning to you too good sir <moving monocle closer to the eye>
                    isItPartOfString(polite_array_day, message_string).catch(function (item) {
                        if (item & !posted) {
                            message.channel.send(translate("polite_hello", polite_array_hello.randomElement()));
                            Log(translate("polite_hello_log", message.author.username.toString()));
                            posted = true;
                        }
                    });
                    isItPartOfString(polite_array_day, message_string + " " + message_string2).catch(function (item) { //combined message
                        if (item & !posted) {
                            message.channel.send(translate("polite_hello", polite_array_hello.randomElement()));
                            Log(translate("polite_hello_log", message.author.username.toString()));
                            posted = true;
                        }
                    });

                    // good night to you too good sir <putting monocle to pocket>
                    isItPartOfString(polite_array_night, message_string).catch(function (item) {
                        if (item & !posted) {
                            message.channel.send(translate("polite_GN", polite_array_bye.randomElement()));
                            Log(translate("polite_GN_log", message.author.username.toString()));
                            posted = true;
                        }
                    });
                    isItPartOfString(polite_array_night, message_string + " " + message_string2).catch(function (item) { //combined message
                        if (item & !posted) {
                            message.channel.send(translate("polite_GN", polite_array_bye.randomElement()));
                            Log(translate("polite_GN_log", message.author.username.toString()));
                            posted = true;
                        }
                    });
                }
            });
        }
    } else {
        Log(translate("polite_log_timer", message.author.username.toString()));
        return;
    }

    /* Called by name */
    if (deunicode(message.content.toLowerCase()).indexOf(deunicode(client.user.username.slice(0, -slice_by_chars).toLowerCase())) > -1) { //slice to allow bot name "mutations"

        if (Boolean(getRandomInt(bot_name_img_chance)) == true) {
            message.channel.send(translate("bot_name", bot_name_txt.randomElement()));
            Log(translate("bot_name_log", message.author.username.toString()));
        } else {
            if (Boolean(getRandomInt(2)) == true || !fs.existsSync(common_learning)) {
                var indexOfTxT = imagesInFolder.indexOf("images/info.txt");
                if (indexOfTxT !== -1) {
                    imagesInFolder.splice(indexOfTxT, 1); //remove git file from array (who need empty file...)
                }
                var randomImageFile = `${process.cwd()}\\${imagesInFolder.randomElement()}`;
                var msg_text = path.parse(randomImageFile).name;
                if (Number(msg_text)) {
                    msg_text = "";
                }
                message.channel.send(msg_text, {
                    file: randomImageFile
                });
                Log(translate("bot_name_log_img", message.author.username.toString(), msg_text, randomImageFile));
            } else {
                fs.readFile(common_learning, function (err, data) {
                    if (err) throw err;
                    var array = onlyStringArr(uniqArr(data.toString().split("\n")));
                    var repl_txt = parse(array.randomElement(), message.author.username.toString());
                    if (Boolean(getRandomInt(2)) == true) { //sometimes post learned message without mentioning username
                        repl_txt = parse(array.randomElement(), "");
                    }
                    message.channel.send(translate("bot_name", repl_txt));
                    Log(translate("bot_name_learning_log", message.author.username.toString()));
                });
            }
        }
        /* create REGEX that match BOT name (first 4 chars to be precise) */
        var str1 = `[${client.user.username.charAt(0)},${client.user.username.charAt(0).toLowerCase()}][${client.user.username.charAt(1)},${client.user.username.charAt(1).toLowerCase()}][${client.user.username.charAt(2)},${client.user.username.charAt(2).toLowerCase()}][${client.user.username.charAt(3)},${client.user.username.charAt(3).toLowerCase()}][a-zA-Z0-9À-ž]*`;
        var regex = new RegExp(str1, "g");
        var learning_text_generalize = message.content.replace(regex, "%s");
        fs.appendFileSync(common_learning, learning_text_generalize + "\n");// write message into file with name of invoker
    }

    if (message.content.indexOf(config.prefix) !== 0) return; // ignore messages without OUR prefix, except... we must be polite right (up)?

    // remove prefix and put statements into array
    const args = message.content.slice(config.prefix.length).trim().split(/ +/g);
    const command = args.shift().toLowerCase();

    /* async commands */
    // bot repeat posted message and delete original one
    isItPartOfString2(translate("cmd_say").split(";"), command).catch(function (item) {
        if (item) {
            removeCallMsg(message);
            if (hasRights(message.author.id)) {
                if (args.length > 0) {
                    const sayMessage = args.join(" ");
                    // And we get the bot to say the thing:
                    message.channel.send(sayMessage);
                    Log(translate("cmd_say_msg", sayMessage, message.author.username.toString()));
                } else {
                    message.channel.send(translate("cmd_say_empty", config.prefix));
                    Log(translate("cmd_say_msg_log", message.author.username.toString()));
                }
            } else {
                message.channel.send(translate("cmd_say_noOwner"));
                Log(translate("cmd_say_noOwner_log", message.author.username.toString()));
            }
        }
    });

    // post list of things (anime in this case)
    isItPartOfString2(translate("cmd_info").split(";"), command).catch(function (item) {
        if (item) {
            removeCallMsg(message);
            AnimeTimer(message, true);
        }
    });

    // download update
    isItPartOfString2(translate("cmd_update").split(";"), command).catch(function (item) {
        if (item) {
            if (hasRights(message.author.id)) {
                removeCallMsg(message);
                selfDestructMSG(message, translate("cmd_update_msg"), 4000, "update");
                Log(translate("cmd_update_msg_log", message.author.username.toString()));
                const { exec } = require('child_process');
                exec(updCMD, (err, stdout, stderr) => {
                    if (err) {
                        Log(err);
                        return;
                    }
                    Log(stdout);
                });
            }
        }
    });

    // change status to
    isItPartOfString2(translate("cmd_status").split(";"), command).catch(function (item) {
        if (item) {
            removeCallMsg(message);
            var status_type = args[0];
            args.splice(0, 1);
            var status_name = args.join(" ");

            if (hasRights(message.author.id)) {
                client.user.setPresence({
                    game: {
                        name: status_name,
                        type: status_type
                    }
                }).then(presence => Log(translate("BOT_set_activity", status_type, status_name)))
                    .catch(console.error);
            } else {
                message.channel.send(translate("cmd_say_noOwner"));
                Log(translate("cmd_say_noOwner_log", message.author.username.toString()));
            }
        }
    });

    // upload log to channel
    isItPartOfString2(translate("cmd_log").split(";"), command).catch(function (item) {
        if (item) {
            removeCallMsg(message);
            if (hasRights(message.author.id)) {
                message.channel.send(translate("cmd_log_msg"), {
                    files: [
                        `./${logFile}`
                    ]
                });
                Log(translate("cmd_log_log", message.author.username.toString()));
            }
        }
    });

    // show bot uptime
    isItPartOfString2(translate("cmd_uptime").split(";"), command).catch(function (item) {
        if (item) {
            removeCallMsg(message);
            var uptime_m = ((Date.now() - start_time) / 1000 / 60).toFixed(2); //convert time to minutes
            var uptime_h = 0;
            var uptime_d = 0;
            do {
                if (uptime_m > 1440) { // 24*60 = 1440 (one day is 1440min)
                    uptime_d++;
                    uptime_m = uptime_m - 1440;
                }
            } while (uptime_m >= 1440);

            do {
                if (uptime_m > 60) { // 1h is 60min
                    uptime_h++;
                    uptime_m = uptime_m - 60;
                }
            }
            while (uptime_m >= 60);
            message.channel.send(translate("cmd_uptime_msg", uptime_d, uptime_h, parseFloat(uptime_m).toFixed(0)));
            Log(translate("cmd_uptime_log", uptime_d, uptime_h, parseFloat(uptime_m).toFixed(0), message.author.username.toString()));
        }
    });

    // force check today anime existance on server
    isItPartOfString2(translate("cmd_forcecheck").split(";"), command).catch(function (item) {
        if (item) {
            removeCallMsg(message);
            selfDestructMSG(message, translate("cmd_forcecheck_msg"), 4000, "forcecheck");
            CheckAnimeOnNet();
            Log(translate("cmd_forcecheck_log", message.author.username.toString()));
        }
    });

    // HELP
    isItPartOfString2(translate("cmd_help").split(";"), command).catch(function (item) {
        if (item) {
            removeCallMsg(message);
            var available_commands = "\n**Says something**: " + translate("cmd_say").split(";");
            available_commands += "\n**Post current list**: " + translate("cmd_info").split(";");
            available_commands += "\n**Download update from github**: " + translate("cmd_update").split(";");
            available_commands += "\n**Change status**: " + translate("cmd_status").split(";");
            available_commands += "\n**Show uptime**: " + translate("cmd_uptime").split(";");
            available_commands += "\n**Force chceck**: " + translate("cmd_forcecheck").split(";");

            selfDestructMSG(message, translate("cmd_help_msg", available_commands), 10000, "help");

            Log(translate("cmd_help_log", message.author.username.toString()));
        }
    });
    //test
    isItPartOfString2(translate("cmd_test").split(";"), command).catch(function (item) {
        if (item) {
            removeCallMsg(message);
            //console.log(message.author.username.toString());
        }
    });
});

client.login(config.credentials.token);
