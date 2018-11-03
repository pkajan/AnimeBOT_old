const util = require('util');
var dateFormat = require('dateformat');
const CronJob = require('cron').CronJob;

// Load up the discord.js library
const Discord = require('discord.js');
const client = new Discord.Client();

// Here we load the config.json file that contains our token and our prefix values.
var config = require('../config.json');

// Here we load the anime.json file that contains release dates of our anime shows.
var anime = require('../anime.json');
var one_week = 7 * 24 * 60 * 60 * 1000;

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
    //var one_week = 7 * 24 * 60 * 60 * 1000;

    if (week_date < today) {
        var calc_date2 = week_date + one_week;
        return weeks_needed(calc_date2, weeks += 1)
    }
    return weeks;
}
/**************************************************************************/
/* STARTUP THINGS */
client.on("ready", () => {
    // This event will run if the bot starts, and logs in, successfully
    Logging(trans("BOT_on_ready", client.users.size, client.channels.size, client.guilds.size));
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
        var obj = (anime);
        var anime_in_array = [];

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

        //console.log(anime_in_array);
        console.log("-----------------------------------");
        anime_in_array.forEach(function (item) {

            var json_date = new Date(item.year, (item.month - 1), item.day, item.hour, item.minute, item.second, 0);
            var weeks = weeks_needed(json_date);
            var countDownDate = json_date.getTime() + (one_week * weeks);

            countDownDate = dateFormat(new Date(countDownDate.valueOf()), "dddd, dS, HH:MM"); // Saturday, 9th, 16:46
            message.channel.send(`**${item.name}**: ` + countDownDate);
            Logging(`**${item.name}**: ` + countDownDate);
        });
    }

});

client.login(config.credentials.token);
