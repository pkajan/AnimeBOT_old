const util = require('util');
const CronJob = require('cron').CronJob;

// Load up the discord.js library
const Discord = require("discord.js");
const client = new Discord.Client();

// Here we load the config.json file that contains our token and our prefix values.
var config = require("../config.json");

/**************************************************************************/
/* FUNCTIONS */
function Logging(message, type = null) {
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
        } else {
            removeCallMsg(message);
            message.channel.send(`${config.prefix} say something(${config.prefix}say something)`);
        }
    }

    if (command === "spam") {
        removeCallMsg(message);
        for (i = args[0]; i > 0; i--) {
            message.channel.send(trans("SPAM") + " " + i);
        }
    }

});



client.login(config.credentials.token);
