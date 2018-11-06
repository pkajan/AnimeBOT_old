const util = require('util');
var dateFormat = require('dateformat');
const CronJob = require('cron').CronJob;

// Load up the discord.js library
const Discord = require('discord.js');
const client = new Discord.Client();

// Here we load the config.json file that contains our token and our prefix values.
var config = require('../config.json');

// Here we load the anime.json file that contains release dates of our anime shows.
var anime_file = '../anime.json';

// Random vars that i will need later...or never
var one_week = 7 * 24 * 60 * 60 * 1000;
var todayArray;

/**************************************************************************/
/* FUNCTIONS */
function Logging(message, /**/) {
    var type = arguments[arguments.length - 1];// last argument is type
    // create log console/file
    switch (type) {
        case "ERROR":
            console.log(`[ERROR] ${message}`);
            break;
        case "INFO":
            console.log(`[INFO] ${message}`);
            break;
        default:
            console.log(`[ALL] ${message}`);
    }
}

function removeCallMsg(message) {
    // delete last message, command call :D
    message.delete().catch(O_o => { });
}

function trans(translatit, /**/) {
    var language = require("../language/" + config.translation + ".json");
    var args = [language[`${translatit}`]];
    for (var i = 1; i < arguments.length; i++) {
        args.push(arguments[i]);
    }
    return util.format.apply(util, args);
}

function weeks_needed(calc_date, weeks = 0) {
    var today = new Date();
    var week_date = new Date(calc_date).getTime();
    if (week_date < today) {
        var calc_date2 = week_date + one_week;
        return weeks_needed(calc_date2, weeks += 1)
    }
    return weeks;
}

function dateDiffInDays(a, b) {
    // a and b are javascript Date objects
    const _MS_PER_DAY = 1000 * 60 * 60 * 24;
    // Discard the time and time-zone information.
    const utc1 = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
    const utc2 = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());

    return Math.floor((utc2 - utc1) / _MS_PER_DAY);
}

function timeDiffInMinutes(dt2, dt1) {
    var diff = (dt2.getTime() - dt1.getTime()) / 1000;
    diff /= 60;

    return Math.abs(Math.round(diff));
}

function AnimeTimer(message = null, textoutput = false) {
    var anime = require(anime_file);
    var obj = anime;
    var zero_dayHeader = "```fix\nToday:```\n";
    var zero_day = "";
    var one_dayHeader = "\n```fix\nOne Day:```\n";
    var one_day = "";
    var two_daysHeader = "\n```fix\nTwo Days:```\n";
    var two_days = "";
    var oth_days = "\n```fix\nLater:```\n";

    var anime_in_array = [];
    var TMPtodayArray = [];
    for (i in obj) {
        var valueToPush = {};
        valueToPush.name = i;
        valueToPush.year = obj[i]["year"];
        valueToPush.month = obj[i]["month"];
        valueToPush.day = obj[i]["day"];
        valueToPush.hour = obj[i]["hour"];
        valueToPush.minute = obj[i]["minute"];
        valueToPush.second = obj[i]["second"];
        anime_in_array.push(valueToPush);
    }

    console.log("-----------------------------------");
    anime_in_array.forEach(function (item) {

        var json_date = new Date(item.year, (item.month - 1), item.day, item.hour, item.minute, item.second, 0);
        var weeks = weeks_needed(json_date);
        var countDownDateR = new Date(json_date.getTime() + (one_week * weeks));

        const a = new Date(), b = new Date(`${countDownDateR.getUTCFullYear()}-${countDownDateR.getUTCMonth() + 1}-${countDownDateR.getUTCDate()}`),
            difference = dateDiffInDays(a, b);

        countDownDate = dateFormat(new Date(countDownDateR.valueOf()), "dddd, dS, HH:MM"); // Saturday, 9th, 16:46
        var onlyTimeForTodays = dateFormat(new Date(countDownDateR.valueOf()), "HH:MM"); // 16:46

        switch (difference) {
            case 0:
                zero_day = zero_day + `**${item.name}**: ` + countDownDate + "\n";
                TMPtodayArray.push([item.name, onlyTimeForTodays]);
                break;
            case 1:
                one_day = one_day + `**${item.name}**: ` + countDownDate + "\n";
                break;
            case 2:
                two_days = two_days + `**${item.name}**: ` + countDownDate + "\n";
                break;
            default:
                oth_days = oth_days + `**${item.name}**: ` + countDownDate + "\n";
        }

        Logging(`**${item.name}**: ` + countDownDate);
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

    if (textoutput) {
        message.channel.send(zero_day + one_day + two_days + oth_days);
    }
}

function SendtoAllGuilds(text) {
    try {
        let toSay = text;
        client.guilds.map((guild) => {
            let found = 0
            guild.channels.map((c) => {
                if (found === 0) {
                    if (c.type === "text") {
                        if (c.permissionsFor(client.user).has("VIEW_CHANNEL") === true) {
                            if (c.permissionsFor(client.user).has("SEND_MESSAGES") === true) {
                                c.send(toSay);
                                found = 1;
                            }
                        }
                    }
                }
            });
        });
        Logging(trans("BOT_send_all"));
    }
    catch (err) {
        console.log("Could not send message to a (few) guild(s)!");
    }
}

/**************************************************************************/
/* STARTUP THINGS */
client.on("ready", () => {
    // This event will run if the bot starts, and logs in, successfully
    Logging(trans("BOT_on_ready", client.users.size, client.channels.size, client.guilds.size));

    client.user.setPresence({
        game: {
            name: config.activityName,
            type: config.activityType
        }
    }).then(presence => console.log(`Activity set to ${config.activityType + ": " + config.activityName}`))
        .catch(console.error);

    /* CRON */
    //every 30minutes check
    const job = new CronJob('*/30 * * * *', function () {
        AnimeTimer(null, false);
        var timeNOW = dateFormat(new Date(), "HH:MM"); // 16:46
        todayArray.forEach(function (item) {
            // dummy date, I know its today so compare only hours/minutes
            dt1 = new Date(2018, 10, 1, item[1].split(":")[0], item[1].split(":")[1], 0, 0);
            dt2 = new Date(2018, 10, 1, timeNOW.split(":")[0], timeNOW.split(":")[1], 0, 0);
            if (timeDiffInMinutes(dt1, dt2) < 59) { //if less than 59minutes announce to all channels
                var message = "```fix\nSOON:```\n**" + item[0] + "**: " + item[1];
                SendtoAllGuilds(message);
            }
        });
    });

    job.start();
    /************************/
});
/* Triggered when addeded/removed from server */
client.on("guildCreate", guild => {
    // This event triggers when the bot joins a guild
    Logging(trans("BOT_on_guildCreate", guild.name, guild.id, guild.memberCount));
    client.user.setActivity(trans("BOT_serving", client.guilds.size));
});
client.on("guildDelete", guild => {
    // this event triggers when the bot is removed from a guild.
    Logging(trans("BOT_on_guildDelete", guild.name, guild.id));
    client.user.setActivity(trans("BOT_serving", client.guilds.size));
});
/**************************************************************************/


/**************************************************************************/
/* Triggered when message is send into chat */
client.on("message", async message => {
    // ignore other bots and self
    if (message.author.bot) return;

    // ignore messages without OUR prefix
    if (message.content.indexOf(config.prefix) !== 0) return;

    // remove prefix and put statements into array
    const args = message.content.slice(config.prefix.length).trim().split(/ +/g);
    const command = args.shift().toLowerCase();

    if (command === "say") {
        if (args.length > 0) {
            const sayMessage = args.join(" ");
            removeCallMsg(message);
            // And we get the bot to say the thing:
            message.channel.send(sayMessage);
            Logging(trans("cmd_say", sayMessage));
        } else {
            removeCallMsg(message);
            message.channel.send(`${config.prefix} say something(${config.prefix}say something)`);
        }
    }

    if (command === "spam") {
        removeCallMsg(message);
        for (i = args[0]; i > 0; i--) {
            message.channel.send(trans("SPAM") + i);
        }
        Logging(trans("cmd_spam", args[0]));
    }

    if (command === "anime") {
        removeCallMsg(message);
        AnimeTimer(message, true);
    }

    /*if (command === "test") {
        removeCallMsg(message);
        console.log(message);
        SendtoAllGuilds("test");
    }*/

});

client.login(config.credentials.token);
