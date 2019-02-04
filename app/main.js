/* LIBS */
const util = require('util');
const dateFormat = require('dateformat');
const CronJob = require('cron').CronJob;
const urlExists = require('url-exists-deep');
const Discord = require('discord.js'); // Load up the discord.js library
const client = new Discord.Client();
const logs = require('fs');
const logFile = 'logs.txt';
/**************************************************************************/

/* Check for necessary files */
const fs = require('fs');
const obj = require('../data/check.json');
Object.keys(obj).forEach(function (key) {
    if (fs.existsSync(obj[key])) {
        Log(key + " OK.");
    } else {
        Log(key + " cannot be found.");
        process.exit(1);
    }
});

/* Loading files */
const config = require('../data/config.json'); //file with config
const data_file = require('../data/anime.json'); //file with names and times
const reply = require('../data/replies.json'); //bot replies
/**************************************************************************/

/* CONSTs & VARs (Random vars that i will need later...or never) */
const one_week = Number(604800000); // 7days in miliseconds (7 * 24 * 60 * 60 * 1000)
const ms_per_day = Number(86400000); // miliseconds per day 1000 * 60 * 60 * 24;
const timeShift = config.timeshift;
const updCMD = 'start cmd.exe @cmd /k "git reset --hard & git fetch --all & git pull & exit';
var todayArray;
var soonArray = new Array();
var polite_array_day = reply.messages_day.split(";");
var polite_array_night = reply.messages_night.split(";");
var polite_array_hello = reply.polite_hello.split(";");
var polite_array_bye = reply.polite_night.split(";");
var polite_array_exceptions = reply.exceptions.split(";");
var LastPoliteMessage = 0;
var LastVoiceChannelMessageJ = 0;
var LastVoiceChannelMessageL = 0;
var voice_join = reply.voice_join_msg.split(";");
var voice_leave = reply.voice_leave_msg.split(";");
var bot_name_txt = reply.text_replies.split(";");
var bot_name_img = reply.image_replies.split(";");
var defaultTextChannel = config.defaultTextChannel;
/**************************************************************************/

/* FUNCTIONS */

/* Logging - will show logs in console and write them into file (for later debugging?) */
function Log(any_string, /**/) {
    var now = dateFormat(new Date(), "dd.mm HH:MM:ss"); // 23.03 16:46:00
    var text = `${now} [LOG] ${any_string}`;
    console.log(text); // show log in console
    logs.appendFileSync(logFile, text + "\n");// write log into file
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

/* OUTPUT difference between two dates in minutes */
function timeDiffInMinutes(a, b) { // a and b must be Date objects
    var diff = ((a.getTime() - b.getTime()) / 1000) / 60; // /1000 => time in seconds
    return Math.abs(Math.round(diff));
}

/* Return only uniq values */
const uniq = (a, key) => {
    var seen = {};
    return a.filter(function (item) {
        var k = key(item);
        return seen.hasOwnProperty(k) ? false : (seen[k] = true);
    })
}

/* "waiting" function */
function sleep(millis) {
    return new Promise(resolve => setTimeout(resolve, millis));
}

/* remove accents/diacritics */
function deunicode(any_string) {
    return any_string.normalize('NFD').replace(/[\u0300-\u036f]/g, "");
}

/* ASYNC!!! will return if part of given string is somewhere in array */
async function isItPartOfString(any_array, any_string) {
    var ImBoolean = false;
    any_array.forEach(function (item) {
        if ((any_string.match(item))) {
            //console.log(any_string.match(item));
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

function getRandomInt(max) {
    return Math.floor(Math.random() * Math.floor(max));
}

/**************************************************************************/

/* Other functions */

/* Remove invoking message */
function removeCallMsg(message) {
    message.delete().catch(error => Log(error));
}

/* Send and remove message in X seconds */
function selfDestructMSG(message, MSGText, time) {
    message.channel.send(MSGText).then(sentMessage => {
        sentMessage.delete(time).catch(error => Log(error));
    });
    Log(translate("BOT_send_selfdestruct", message.author.username.toString()));
}

/* Send and remove message in X seconds (from given channel)*/
function selfDestructMSGID(channelID, MSGText, time, user = null) {
    client.channels.get(channelID).send(MSGText).then(sentMessage => {
        sentMessage.delete(time).catch(error => Log(error));
    });
    Log(translate("BOT_send_selfdestructid", user));
}

/* Send message into given channel */
function sendMSGID(channelID, MSGText) {
    client.channels.get(channelID).send(MSGText);
    Log(translate("BOT_send_specific"));
}

/* Send message to all servers (guilds) bot is in */
function SendtoAllGuilds(text, picture = null) {
    try {
        let toSay = text;
        client.guilds.map((guild) => {
            let found = 0
            guild.channels.map((c) => {
                if (found === 0) {
                    if (c.type === "text") {
                        if (c.permissionsFor(client.user).has("VIEW_CHANNEL") === true) {
                            if (c.permissionsFor(client.user).has("SEND_MESSAGES") === true) {
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
                        }
                    }
                }
            });
        });
        Log(translate("BOT_send_all"));
    }
    catch (err) {
        Log(translate("BOT_could_not_send"));
    }
}
/* implement "random" into array and return rng value from given array = array.randomElement */
Array.prototype.randomElement = function () {
    return this[Math.floor(Math.random() * this.length)]
}

/* WALL OF CODE */
function AnimeTimer(message = null, textoutput = false) {
    var anime = data_file;
    var obj = anime;
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
    for (i in obj) {
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
                            TMPtodayArray.push([item.name, CDNext.getTime(), item.link + `${parseInt(item.starting_episode) + parseInt(weeks)}`, item.picture]);
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
        zero_day = zero_dayHeader + zero_day;
    }
    if (one_day.length > 1) {
        one_day = one_dayHeader + one_day;
    }
    if (two_days.length > 1) {
        two_days = two_daysHeader + two_days;
    }
    if (less_than_week.length > 1) {
        less_than_week = less_than_weekHeader + less_than_week;
    }

    if (textoutput) {
        selfDestructMSG(message, zero_day + one_day + two_days + less_than_week + oth_days, 30000);
    }
}

/* Put "today" animes into array for later use */
function timeCalcMessage() {
    AnimeTimer(null, false);
    var soonArrays = new Array();
    todayArray.forEach(function (item) {
        dt1 = new Date(item[1]);
        dt2 = new Date();
        if (timeDiffInMinutes(dt1, dt2) <= 120) {
            if (item[2]) {
                var valueToPush = {};
                valueToPush.name = item[0];
                valueToPush.time = item[1];
                valueToPush.url = item[2];
                valueToPush.picture = item[3];
                soonArrays.push(valueToPush);
                valueToPush = {};
            }
            soonArrays.forEach(function (itemz) {
                soonArray.push(itemz);
            })
            soonArray = uniq(soonArray, JSON.stringify);
        }
    });
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
    //every 2 hour check
    const job = new CronJob('0 */2 * * *', function () {
        var message = timeCalcMessage();
        if (typeof message !== 'undefined') {
            // SendtoAllGuilds(message);
        }
    });
    job.start();

    /* CRON2 ***********************************************************/
    // check every 5 minutes if anime is there
    const job2 = new CronJob('*/5 * * * *', function () {
        if (typeof soonArray != 'undefined') {
            soonArray.forEach(function (item) {
                if (item.url) {
                    urlExists(item.url)
                        .then(function (response) {
                            if (response) {
                                Log(translate("BOT_cron_link_yes", response.href));
                                var messages = "```fix\n" + item.name + "```\n" + `${item.url}`;
                                var index = soonArray.indexOf(item);
                                Log(translate("BOT_deleting", JSON.stringify(soonArray[index])));
                                delete soonArray[index];
                                if (item.picture) {
                                    SendtoAllGuilds(messages, item.picture);
                                } else {
                                    SendtoAllGuilds(messages);
                                }
                            } else {
                                Log(translate("BOT_cron_link_no", item.name));
                            }
                        });
                }
            });
        }
    });
    job2.start();
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
    execSync('start cmd.exe @cmd /k "run_bot.cmd"');
});

/* Triggered when user join/leave voice channel */
client.on('voiceStateUpdate', (oldMember, newMember) => {
    let newUserChannel = newMember.voiceChannel;
    let oldUserChannel = oldMember.voiceChannel;

    if (!newMember.user.bot || !oldMember.user.bot) { // bot protection
        if (oldUserChannel === undefined && newUserChannel !== undefined) {
            // User Joins a voice channel
            if ((parseInt(new Date().getTime()) - parseInt(LastVoiceChannelMessageJ)) > 60000 && Boolean(getRandomInt(2)) == true) { //prevent spamming on join/leave!!
                LastVoiceChannelMessageJ = new Date().getTime();
                selfDestructMSGID(defaultTextChannel, translate("voice_join", voice_join.randomElement()), 20000, newMember.user.username.toString());//send message and remove if after X seconds
            }
            Log(translate("voice_join_log", newMember.user.username.toString()));
        } else if (newUserChannel === undefined) {
            // User leaves a voice channel
            if ((parseInt(new Date().getTime()) - parseInt(LastVoiceChannelMessageL)) > 60000 && Boolean(getRandomInt(2)) == true) { //prevent spamming on join/leave!!
                LastVoiceChannelMessageL = new Date().getTime();
                selfDestructMSGID(defaultTextChannel, translate("voice_leave", voice_leave.randomElement()), 20000, oldMember.user.username.toString());//send message and remove if after X seconds
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

            isItPartOfString(polite_array_exceptions, message_string).catch(function (exception) {
                if (!exception) {
                    // good morning to you too good sir <moving monocle closer to the eye>
                    isItPartOfString(polite_array_day, message_string).catch(function (item) {
                        if (item) {
                            message.channel.send(translate("polite_hello", polite_array_hello.randomElement()));
                            Log(translate("polite_hello_log", message.author.username.toString()));
                        }
                    });

                    // good night to you too good sir <putting monocle to pocket>
                    isItPartOfString(polite_array_night, message_string).catch(function (item) {
                        if (item) {
                            message.channel.send(translate("polite_GN", polite_array_bye.randomElement()));
                            Log(translate("polite_GN_log", message.author.username.toString()));
                        }
                    });
                }
            });
        }
    } else {
        return;
    }

    /* Called by name */
    if (message.content.toLowerCase().indexOf(client.user.username.slice(0, -1).toLowerCase()) > -1) { //slice to allow bot name "mutations"

        if (Boolean(getRandomInt(5)) == true) {
            message.channel.send(translate("bot_name", bot_name_txt.randomElement()));
        } else {
            var rngimg = bot_name_img.randomElement().split("==");
            message.channel.send(`${rngimg[0]}`, {
                file: `${rngimg[1]}`
            });
        }
        Log(translate("bot_name_log", message.author.username.toString()));
    }

    if (message.content.indexOf(config.prefix) !== 0) return; // ignore messages without OUR prefix, except... we must be polite right (up)?

    // remove prefix and put statements into array
    const args = message.content.slice(config.prefix.length).trim().split(/ +/g);
    const command = args.shift().toLowerCase();

    if (command === translate("cmd_say")) {
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

    if (command === translate("cmd_spam")) {
        removeCallMsg(message);
        if (hasRights(message.author.id)) {
            if (args[0]) {
                for (i = args[0]; i > 0; i--) {
                    message.channel.send(translate("SPAM") + i);
                }
                Log(translate("cmd_spam_msg", args[0], message.author.username.toString()));
            }
            Log(translate("cmd_spam_msg_empty", args[0], message.author.username.toString()));
        } else {
            message.channel.send(translate("cmd_say_noOwner"));
            Log(translate("cmd_say_noOwner_log", message.author.username.toString()));
        }
    }

    if (command === translate("cmd_info")) {
        removeCallMsg(message);
        AnimeTimer(message, true);
    }

    if (command === translate("cmd_update")) {
        if (hasRights(message.author.id)) {
            removeCallMsg(message);
            selfDestructMSG(message, translate("cmd_update_msg"), 4000);
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

    if (command === translate("cmd_status")) {
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

    if (command === translate("cmd_screem")) {
        if (hasRights(message.author.id)) {
            removeCallMsg(message);
            var voiceChannel = null;
            if (args.length > 0) {
                voiceChannel = message.guild.channels.find(channel => channel.name === args.join(" "));
            }
            if (voiceChannel == null) {
                voiceChannel = message.member.voiceChannel;
            }
            voiceChannel.join().then(connection => {
                const dispatcher = connection.playFile('./audio/screem.mp3');
                dispatcher.on("end", end => {
                    voiceChannel.leave();
                });
            }).catch(err => console.log(err));
            Log(translate("cmd_screem_log", message.author.username.toString()));
        }
    }

    if (command === translate("cmd_log")) {
        removeCallMsg(message);
        if (hasRights(message.author.id)) {
            message.channel.send(translate("cmd_log_msg"), {
                files: [
                    "./logs.txt"
                ]
            });
            Log(translate("cmd_log_log", message.author.username.toString()));
        }
    }

    if (command === translate("cmd_test")) {
        removeCallMsg(message);
        //console.log(message.author.username.toString());
    }

});

client.login(config.credentials.token);
