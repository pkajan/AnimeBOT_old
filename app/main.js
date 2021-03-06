const things = require('./things.js');
const util = require('util');
const discord = require('./things_discord.js');
const page_checks = require('./page_checks.js');
const calculate = require('./calculate.js');
const learning = require('./learning.js');

/* Check for necessary files */
const fs = require('fs-extra');
const obj = require('../config/check.json');
Object.keys(obj).forEach(function (key) {
    if (fs.existsSync(obj[key])) {
        things.log(key + " OK.");
    } else {
        things.log(key + " cannot be found.");
        process.exit(1);
    }
});

const config = require('../config/config.json'); //file with config
const data_file = require('../data/anime.json'); //file with names and times
const reply = require('../data/replies.json'); //bot replies

const Discord = require('discord.js');
const CronJob = require('cron').CronJob;

const updCMD = "start cmd.exe @cmd /k \"git reset --hard & git fetch --all & git pull & exit\"";

const announceFile = "announce.json";
const announceFileFIN = "announceFIN.txt";
const common_learning = "common_learning.txt";
const radioFile = 'data/radio.json';

fs.appendFileSync(announceFileFIN, ""); //create empty file for finished announcements
if (!fs.existsSync(announceFile)) {
    fs.appendFileSync(announceFile, "{}");//create empty file for announcements
}


var delayer = 0;
var silencer = 0;
var LastPoliteMessage = 0;
var delayer_learning = 0;
var LastVoiceChannelMessageJ = 0;
var LastVoiceChannelMessageL = 0;
var userStatus = {};
var soonArray = new Array();

const client = new Discord.Client();
const start_time = Date.now();


function animeCheckRoutine(existance, tmpCHECKVAR, item) {
    if (existance) {
        things.log(things.translate("BOT_cron_link_yes", tmpCHECKVAR));
        if (item.url == tmpCHECKVAR) {
            console.log(item.url + `\n` + tmpCHECKVAR);
            var messages = "```fix\n" + item.name + "```\n" + `<${item.url}>\n`;
        } else {
            var messages = "```fix\n" + item.name + "```\n" + `<${tmpCHECKVAR}>\n` + `or\n<${item.url}>\n`;
        }
        var index = soonArray.indexOf(item);
        delete soonArray[index];
        things.log(things.translate("BOT_deleting", item.name));
        things.JSON_file_remove_element(announceFile, tmpCHECKVAR, tmpCHECKVAR);
        ////////////////////////////////////////////////////
        try {
            var alreadyDONE = fs.readFileSync(announceFileFIN).toString();
        } catch (err) {
            things.log(err);
            fs.appendFileSync(announceFileFIN, ""); //create empty file for finished announcements
            var alreadyDONE = fs.readFileSync(announceFileFIN).toString();
        }
        things.wait(1000);
        if (alreadyDONE.indexOf(item.url) < 0) {
            if (item.picture) {
                /*img existance check */
                page_checks.defaultPageCheck(item.picture).then(data => {
                    if (data == true) {
                        discord.SendtoAllGuilds(client, messages, item.picture);
                    } else {
                        discord.SendtoAllGuilds(client, messages, `${process.cwd()}\\others\\false.png`);
                    }
                });
            } else {
                discord.SendtoAllGuilds(messages);
            }
            things.fwASYNC(announceFileFIN, item.url + " \n");
        }
    } else {
        things.log(things.translate("BOT_cron_link_no", item.name, item.eps, tmpCHECKVAR));
    }
}

/* check "today" animes for existance */
function CheckAnimeOnNet() {
    var todayArrayFromFile = things.JSON_file_read(announceFile); // read from file
    var soonArrays = new Array();
    for (var item in todayArrayFromFile) {
        var valueToPush = {};
        valueToPush.name = todayArrayFromFile[item].NAME;
        valueToPush.url = todayArrayFromFile[item].URL;
        valueToPush.picture = todayArrayFromFile[item].IMAGE;
        valueToPush.eps = todayArrayFromFile[item].EPS;
        valueToPush.checkTo = item;
        soonArrays.push(valueToPush);
        valueToPush = {};

        soonArrays.forEach(function (itemz) {
            soonArray.push(itemz);
        })
        soonArray = things.uniq(soonArray, JSON.stringify);
    }

    if (typeof soonArray != "undefined") {
        soonArray.forEach(function (item) {
            var tmpCHECKVAR = null;
            if (typeof (item.checkTo) == 'string') {
                tmpCHECKVAR = item.checkTo;
            } else {
                tmpCHECKVAR = item.url;
            }

            // if anime is on gogoanime.io
            if (tmpCHECKVAR.includes("gogoanime")) {
                page_checks.gogoanime(tmpCHECKVAR).then(existance => {
                    animeCheckRoutine(existance, tmpCHECKVAR, item);
                });
            } else { // if link reffers to somewhere else
                page_checks.defaultPageCheck(tmpCHECKVAR).then(existance => {
                    animeCheckRoutine(existance, tmpCHECKVAR, item);
                });
            }
        });
    }
}

/* poor attempt for error handling */
client.on("error", (error) => {
    things.log("---------ERROR----------");
    if (error.message.includes("getaddrinfo ENOTFOUND")) {
        things.log("Connection fault...");
        things.startCountdown(config.sleepDuration_seconds, things.restart_program);
        console.log("restarting");
    } else {
        things.log("Unknown error...");
        things.log(util.inspect(error));
        things.startCountdown(config.sleepDuration_seconds, things.restart_program);
        console.log("restarting");
    }
});

client.on('warning', (warning) => {
    things.log("---------WARNING----------");
    if (warning.message.includes("<reserved_for_later>")) {
        //nothing known, yet...
    } else {
        things.log("Unknown warning...");
        things.log(util.inspect(warning));
        things.startCountdown(config.sleepDuration_seconds, things.restart_program);
        console.log("restarting");
    }
});

/* This event will run if the bot starts, and logs into channel, successfully */
client.on('ready', () => {
    things.log(things.translate("BOT_on_ready", client.users.size, client.channels.size, client.guilds.size));
    calculate.StringOfAnime(calculate.fillAnimeArray(data_file), null, false); //find todays anime and put it into file
    //set bot status
    client.user.setPresence({
        game: {
            name: config.activityName,
            type: config.activityType
        }
    }).then(presence => things.log(things.translate("BOT_set_activity", config.activityType, config.activityName)))
        .catch(console.error);

    /* CRONS ***********************************************************/
    // check every X minutes if anime is there
    const job1 = new CronJob(`*/${config.checkXminutes} * * * *`, function () {
        CheckAnimeOnNet();
    });
    job1.start();
    things.log(things.translate("cron_started", 1));

    //find todays anime and put it into file
    const job2 = new CronJob("1 1 * * *", function () {
        calculate.StringOfAnime(calculate.fillAnimeArray(data_file), null, false);
    });
    job2.start();
    things.log(things.translate("cron_started", 2));

    //download online list
    if (config.onlineList !== null && config.onlineList !== "" && typeof config.onlineList !== 'undefined') {
        const job3 = new CronJob("1 0 * * *", function () {
            page_checks.defaultPageCheck(config.onlineList).then(data => {
                if (data) {
                    things.download(config.onlineList, "data/anime.json");
                    things.log(things.translate("cmd_onlineList_exist"));
                } else {
                    things.log(things.translate("cmd_onlineList_notexist"));
                }
            });
        });
        job3.start();
        things.log(things.translate("cron_started", 3));
    }
});

/* Triggered when addeded/removed from server */
client.on("guildCreate", guild => {
    things.log(translate("BOT_on_guildCreate", guild.name, guild.id, guild.memberCount));
    client.user.setActivity(translate("BOT_serving", client.guilds.size));
});
client.on("guildDelete", guild => {
    things.log(translate("BOT_on_guildDelete", guild.name, guild.id));
    client.user.setActivity(translate("BOT_serving", client.guilds.size));
});

/* Triggered when user join/leave voice channel */
client.on("voiceStateUpdate", (oldMember, newMember) => {
    let newUserChannel = newMember.voiceChannel;
    let oldUserChannel = oldMember.voiceChannel;

    if (!newMember.user.bot || !oldMember.user.bot) { // bot protection
        if (oldUserChannel === undefined && newUserChannel !== undefined) {
            // User Joins a voice channel
            if ((parseInt(new Date().getTime()) - parseInt(LastVoiceChannelMessageJ)) > 60000 && Boolean(things.getRandomInt(2)) == true) { //prevent spamming on join/leave!!
                LastVoiceChannelMessageJ = new Date().getTime();
                discord.selfDestructMSGID(client, config.defaultTextChannel, things.translate("voice_join", reply.voice_join_msg.split(";").randomElement()), 20000, newMember.user.username.toString(), "userJoinVoice");//send message and remove if after X seconds
            }
            things.log(things.translate("voice_join_log", newMember.user.username.toString()));
        } else if (newUserChannel === undefined) {
            // User leaves a voice channel
            if ((parseInt(new Date().getTime()) - parseInt(LastVoiceChannelMessageL)) > 60000 && Boolean(things.getRandomInt(2)) == true) { //prevent spamming on join/leave!!
                LastVoiceChannelMessageL = new Date().getTime();
                discord.selfDestructMSGID(client, config.defaultTextChannel, things.translate("voice_leave", reply.voice_leave_msg.split(";").randomElement()), 20000, oldMember.user.username.toString(), "userLeaveVoice");//send message and remove if after X seconds
            }
            things.log(things.translate("voice_leave_log", oldMember.user.username.toString()));
        }
    }
});

/* STATUS update */
client.on('presenceUpdate', (oldMember, newMember) => {
    if ((!newMember.user.bot || !oldMember.user.bot) & (Date.now() - delayer > 300)) { // bot & spam protection (300ms delay)
        var UserName = newMember.user.username.toString();
        if (oldMember.presence.game == null) { //get "old" activity name + null fix
            var OldStatus = null;
        } else {
            var OldStatus = oldMember.presence.game.name;
        }

        if (newMember.presence.game == null) { //get "new" activity name + null fix
            var NewStatus = null;
        } else {
            var NewStatus = newMember.presence.game.name;
        }

        if (OldStatus == NewStatus) { // end function if there is nothing to announce
            return;
        }

        if (((userStatus[UserName] != NewStatus) & (OldStatus == null)) || ((NewStatus != userStatus[UserName]) & (OldStatus != NewStatus))) {
            stat_message = UserName + " is playing " + NewStatus;
            userStatus[UserName] == NewStatus;
        }

        if (NewStatus == null & OldStatus != null) {
            stat_message = UserName + " stopped playing " + OldStatus;
            userStatus[UserName] == NewStatus;
        }

        if (config.status_update_announce_channel_id > 1) {
            discord.sendMSGID(client, config.status_update_announce_channel_id, stat_message); //if allowed send message into chat
        }
        things.log(stat_message);
        delayer = Date.now();
    }
});


/* Triggered when message is send into chat */
client.on("message", async message => {
    if (message.author.bot) return; // ignore other bots and self

    // ignore messages without OUR prefix
    if (message.content.startsWith(config.prefix)) {
        // remove prefix and put statements into array
        const args = message.content.slice(config.prefix.length).trim().split(/ +/g);
        const command = args.shift().toLowerCase();

        /* async commands */
        // bot repeat posted message and delete original one
        things.isItPartOfString_identical(things.translate("cmd_say").split(";"), command).catch(function (item) {
            if (item) {
                discord.removeCallMsg(message);
                if (things.hasRights(message.author.id)) {
                    if (args.length > 0) {
                        const sayMessage = args.join(" ");
                        // And we get the bot to say the thing:
                        discord.MSGReply(message, sayMessage);
                        things.log(things.translate("cmd_say_msg", sayMessage, message.author.username.toString()));
                    } else {
                        discord.MSGReply(message, things.translate("cmd_say_empty", config.prefix));
                        things.log(things.translate("cmd_say_msg_log", message.author.username.toString()));
                    }
                } else {
                    discord.MSGReply(message, things.translate("cmd_say_noOwner"));
                    things.log(things.translate("cmd_say_noOwner_log", message.author.username.toString()));
                }
            }
        });

        // post list of things (anime in this case)
        things.isItPartOfString_identical(things.translate("cmd_info").split(";"), command).catch(function (item) {
            if (item) {
                discord.removeCallMsg(message);
                var arrayOfthings = calculate.fillAnimeArray(data_file);
                if (arrayOfthings.length > 0) {
                    calculate.StringOfAnime(calculate.fillAnimeArray(data_file), message, true); //post table
                } else {
                    discord.selfDestructMSG(message, things.translate("cmd_info_empty"), 5000);
                }
            }
        });

        // change status to
        things.isItPartOfString_identical(things.translate("cmd_status").split(";"), command).catch(function (item) {
            if (item) {
                discord.removeCallMsg(message);
                var status_type = args[0];
                args.splice(0, 1);
                var status_name = args.join(" ");

                if (things.hasRights(message.author.id)) {
                    client.user.setPresence({
                        game: {
                            name: status_name,
                            type: status_type
                        }
                    }).then(presence => things.log(things.translate("BOT_set_activity", status_type, status_name)))
                        .catch(console.error);
                } else {
                    discord.MSGReply(message, things.translate("cmd_say_noOwner"));
                    things.log(things.translate("cmd_say_noOwner_log", message.author.username.toString()));
                }
            }
        });

        // upload log to channel
        things.isItPartOfString_identical(things.translate("cmd_log").split(";"), command).catch(function (item) {
            if (item) {
                discord.removeCallMsg(message);
                if (things.hasRights(message.author.id)) {
                    discord.MSGReply(message, things.translate("cmd_log_msg"), {
                        files: [
                            `./${config.logFile}`
                        ]
                    });
                    things.log(things.translate("cmd_log_log", message.author.username.toString()));
                }
            }
        });

        // download update
        things.isItPartOfString_identical(things.translate("cmd_update").split(";"), command).catch(function (item) {
            if (item) {
                if (things.hasRights(message.author.id)) {
                    discord.removeCallMsg(message);
                    discord.selfDestructMSG(message, things.translate("cmd_update_msg"), 4000, "update");
                    things.log(things.translate("cmd_update_msg_log", message.author.username.toString()));
                    const { exec } = require('child_process');
                    exec(updCMD, (err, stdout, stderr) => {
                        if (err) {
                            things.log(err);
                            return;
                        }
                        things.log(stdout);
                    });
                }
            }
        });

        // show bot uptime
        things.isItPartOfString_identical(things.translate("cmd_uptime").split(";"), command).catch(function (item) {
            if (item) {
                discord.removeCallMsg(message);
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
                discord.MSGReply(message, things.translate("cmd_uptime_msg", uptime_d, uptime_h, parseFloat(uptime_m).toFixed(0)));
                things.log(things.translate("cmd_uptime_log", uptime_d, uptime_h, parseFloat(uptime_m).toFixed(0), message.author.username.toString()));
            }
        });

        // add string to dictionary
        things.isItPartOfString_identical(things.translate("cmd_dictionary").split(";"), command).catch(function (item) {
            if (item) {
                discord.removeCallMsg(message);
                if (things.hasRights(message.author.id)) {
                    if (args.length > 0) {
                        const sayMessage = args.join(" ");
                        // And we get the bot to say the thing:
                        fs.appendFileSync(common_learning, sayMessage + "\n");// write message into dictionary
                        things.log(things.translate("cmd_dictionary_log", sayMessage, message.author.username.toString()));
                    } else {
                        discord.MSGReply(message, translate("cmd_say_empty", config.prefix))
                        things.log(things.translate("cmd_say_msg_log", message.author.username.toString()));
                    }
                } else {
                    discord.MSGReply(message, translate("cmd_say_noOwner"));
                    things.log(things.translate("cmd_say_noOwner_log", message.author.username.toString()));
                }
            }
        });

        // link test
        things.isItPartOfString_identical(things.translate("cmd_link").split(";"), command).catch(function (item) {
            if (item) {
                discord.removeCallMsg(message);
                const link_in_Message = args.join(" ");
                page_checks.defaultPageCheck(link_in_Message).then(data => {
                    if (data) {
                        discord.selfDestructMSG(message, things.translate("cmd_link_exist", "<" + link_in_Message + ">"), 30000, "LinkCheck");
                        things.log(things.translate("cmd_link_exist", link_in_Message));
                    } else {
                        discord.selfDestructMSG(message, things.translate("cmd_link_notexist", "<" + link_in_Message + ">"), 30000, "LinkCheck");
                        things.log(things.translate("cmd_link_notexist", link_in_Message));
                    }
                });
            }
        });

        // force check today anime existance on server
        things.isItPartOfString_identical(things.translate("cmd_forcecheck").split(";"), command).catch(function (item) {
            if (item) {
                discord.removeCallMsg(message);
                discord.selfDestructMSG(message, things.translate("cmd_forcecheck_msg"), 4000, "forcecheck");
                CheckAnimeOnNet();
                things.log(things.translate("cmd_forcecheck_log", message.author.username.toString()));
            }
        });

        // silencer
        things.isItPartOfString_identical(things.translate("cmd_silencer").split(";"), command).catch(function (item) {
            if (item) {
                discord.removeCallMsg(message);
                discord.selfDestructMSG(message, things.translate("cmd_silencer_msg", config.silence_time_ms / 60000), 5000, "Silence");
                silencer = Date.now();
            }
        });

        // manualy initiate anime list update
        things.isItPartOfString_identical(things.translate("cmd_onlinelist").split(";"), command).catch(function (item) {
            if (item) {
                discord.removeCallMsg(message);
                page_checks.defaultPageCheck(config.onlineList).then(data => {
                    if (data) {
                        things.download(config.onlineList, "data/anime.json");
                        discord.selfDestructMSG(message, things.translate("cmd_onlineList_exist"), 10000, "LinkCheck");
                        things.log(things.translate("cmd_onlineList_exist"));
                    } else {
                        discord.selfDestructMSG(message, things.translate("cmd_onlineList_notexist"), 5000, "LinkCheck");
                        things.log(things.translate("cmd_onlineList_notexist"));
                    }
                });
            }
        });

        //google
        things.isItPartOfString_identical(things.translate("cmd_google").split(";"), command).catch(function (item) {
            if (item) {
                discord.removeCallMsg(message);
                const search_string = args.join("+");
                things.log(things.translate("cmd_google_msg_log", args.join(" "), message.author.username.toString()));
                discord.MSGReply(message, things.translate("cmd_google_msg", "https://www.google.com/search?q=" + search_string));
            }
        });

        //musicbot command
        things.isItPartOfString_identical(things.translate("cmd_radio").split(";"), command).catch(function (item) {
            if (item) {
                discord.removeCallMsg(message);
                var radioList = things.JSON_file_read(radioFile);

                if (typeof radioList[args[0]] !== 'undefined') {
                    things.log(things.translate("cmd_radio_log", radioList[args[0]], message.author.username.toString()));
                    discord.MSGReply(message, things.translate("cmd_radio_msg", radioList[args[0]]));
                    console.log(things.translate("cmd_radio_msg", radioList[args[0]]));
                    discord.MSGReply(message, "!skip");
                } else {
                    var radioListReadable = "";
                    var objectKeysArray = Object.keys(radioList)
                    objectKeysArray.forEach(function (objKey) {
                        radioListReadable += objKey + "\n"
                    })
                    discord.MSGReply(message, things.translate("cmd_radio_msg_nonexist", radioListReadable));
                }

            }
        });

        //test
        things.isItPartOfString_identical(things.translate("cmd_test").split(";"), command).catch(function (item) {
            if (item) {
                discord.removeCallMsg(message);
                //console.log(message.author.username.toString());
            }
        });

    }
});

function uglyfunction(message, type_of_response) {
    if (message.author.bot) return; // ignore other bots and self


    if (!message.content.startsWith(config.prefix) && !things.startWithArr(message.content, config.prefix_ignore.split(" "))) {

        /* Called by name */
        if (things.deunicode(message.content.toLowerCase()).indexOf(things.deunicode(client.user.username.slice(0, -config.slice_name_by_chars).toLowerCase())) > -1) { //slice to allow bot name "mutations"
            learning.bot_response_poster(client, message);
            things.log("Called by name, " + message.author.username.toString(), type_of_response);
        }

        /* Polite hello/bye */
        if (config.polite) {
            if ((parseInt(new Date().getTime()) - parseInt(LastPoliteMessage)) > 20000) { //prevent spamming channel with hello to hello to hello...HELL NO!!
                LastPoliteMessage = new Date().getTime();
                var message_string = things.deunicode(message.content).toLowerCase().split(" ")[0];
                var message_string2 = things.deunicode(message.content).toLowerCase().split(" ")[1];// if greeting message has 2 parts (good morning...)
                var posted = false;

                things.isItPartOfString(reply.exceptions.split(";"), message_string).catch(function (exception) {
                    if (!exception) {
                        // good morning to you too good sir <moving monocle closer to the eye>
                        things.isItPartOfString(reply.messages_day.split(";"), message_string).catch(function (item) {
                            if (item & !posted) {
                                message.channel.send(things.translate("polite_hello", reply.polite_hello.split(";").randomElement()));
                                things.log(things.translate("polite_hello_log", message.author.username.toString()));
                                posted = true;
                                postThrottling = true;
                                things.log("Day", type_of_response, message.author.username.toString());
                            }
                        });
                        things.isItPartOfString(reply.messages_day.split(";"), message_string + " " + message_string2).catch(function (item) { //combined message
                            if (item & !posted) {
                                message.channel.send(things.translate("polite_hello", reply.polite_hello.split(";").randomElement()));
                                things.log(things.translate("polite_hello_log", message.author.username.toString()));
                                posted = true;
                                postThrottling = true;
                                things.log("Day combined", type_of_response, message.author.username.toString());
                            }
                        });

                        // good night to you too good sir <putting monocle to pocket>
                        things.isItPartOfString(reply.messages_night.split(";"), message_string).catch(function (item) {
                            if (item & !posted) {
                                message.channel.send(things.translate("polite_GN", reply.polite_night.split(";").randomElement()));
                                things.log(things.translate("polite_GN_log", message.author.username.toString()));
                                posted = true;
                                postThrottling = true;
                                things.log("Night", type_of_response, message.author.username.toString());
                            }
                        });

                        things.isItPartOfString(reply.messages_night.split(";"), message_string + " " + message_string2).catch(function (item) { //combined message
                            if (item & !posted) {
                                message.channel.send(things.translate("polite_GN", reply.polite_night.split(";").randomElement()));
                                things.log(things.translate("polite_GN_log", message.author.username.toString()));
                                posted = true;
                                postThrottling = true;
                                things.log("Night combined", type_of_response, message.author.username.toString());
                            }
                        });
                    }
                });
            }
        } else {
            things.log(things.translate("polite_log_timer", message.author.username.toString()));
            return;
        }

        /* random responses */
        things.wait(500);
        if (postThrottling == false) {
            if (things.getRandomInt(config.randomChance) == true && (Date.now() - delayer_learning > 300)) {
                if (Date.now() - silencer > config.silence_time_ms) {
                    learning.bot_response_poster(client, message, true);
                    delayer_learning = Date.now();
                    things.log("Random message", type_of_response, message.author.username.toString());
                } else {
                    things.log(things.translate("cmd_silencer_msg_log"));
                }
            } else {
                return; // ignore messages without OUR prefix, except... we must be polite and...a bit of random doesnt hurt :D
            }
        } else {
            postThrottling = false;
        }
    }
}

/* working with messages without our prefix */
var postThrottling = false;
client.on("message", async message => {
    uglyfunction(message, "Normal Message");
});

client.on('messageUpdate', (oldMessage, newMessage) => {
    uglyfunction(newMessage, "Edited Message");

});

client.login(config.credentials.token);
