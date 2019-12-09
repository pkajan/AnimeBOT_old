const things = require('./things.js');
const discord = require('./things_discord.js');
const fs = require('fs-extra');
const reply = require('../data/replies.json'); //bot replies
var learning_array_exceptions = reply.exceptions_learning.split(";");

var pathToImages = "images";
const common_learning = "common_learning.txt";
const path = require('path');
var imagesInFolder = [];
const config = require('../config/config.json'); //file with config

fs.readdir(pathToImages, function (err, items) {
    if (items) {
        for (var i = 0; i < items.length; i++) {
            var file = pathToImages + '/' + items[i];
            imagesInFolder.push(file);
        }
    }
});

module.exports = {
    /* ?????????? */
    bot_response_poster: function (client, message, randomresponse = false) {
        var message_author = message.author.username.toString();
        var nickname_of_user = client.guilds.get(message.guild.id).member(message.author).nickname;

        if (nickname_of_user == null) { //prevent error when nickname is not set
            nickname_of_user = message.author.username.toString();
        } else {
            nickname_of_user = nickname_of_user.toString();
        }


        if (Boolean(things.getRandomInt(parseInt(config.bot_img_chance))) == true || !fs.existsSync(common_learning)) {
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
            if (!randomresponse) {
                things.log(things.translate("bot_name_log_img", message.author.username.toString(), msg_text, randomImageFile));
            } else {
                things.log(things.translate("bot_RNG_log_img", message.author.username.toString(), msg_text, randomImageFile));
            }
        } else {
            fs.readFile(common_learning, function (err, data) {
                if (err) throw err;
                var array = things.onlyStringArr(things.uniqArr(data.toString().split("\n")));
                var repl_txt = things.parse(array.randomElement(), nickname_of_user);
                if (Boolean(things.getRandomInt(2)) == true) { //sometimes post learned message, without mentioning username
                    repl_txt = things.parse(array.randomElement(), "");
                    repl_txt = repl_txt.replace(/^\s*,/g, ' ').replace(/\s\s+/g, ' ').replace(/\s\./g, '.');
                    //replace "bugged" texts: comma at start, multiple spaces, space before comma"
                }
                message.channel.send(things.translate("bot_name", repl_txt));
                if (!randomresponse) {
                    things.log(things.translate("bot_name_learning_log", message_author));
                } else {
                    things.log(things.translate("bot_RNG_learning_log", message_author));
                }
            });
        }

        things.isItPartOfString(learning_array_exceptions, things.deunicode(message.content).toLowerCase()).catch(function (exception) {
            if (!exception & message.content != null) {
                /* create REGEX that match BOT name (first 4 chars to be precise) */
                var str1 = `[${client.user.username.charAt(0)},${client.user.username.charAt(0).toLowerCase()}][${client.user.username.charAt(1)},${client.user.username.charAt(1).toLowerCase()}][${client.user.username.charAt(2)},${client.user.username.charAt(2).toLowerCase()}][${client.user.username.charAt(3)},${client.user.username.charAt(3).toLowerCase()}][a-zA-Z0-9À-ž]*`;
                var regex = new RegExp(str1, "g");
                var learning_text_generalize = message.content.replace(regex, "%s");
                fs.appendFileSync(common_learning, learning_text_generalize + "\n");// write message into dictionary
            }
        });
    }
}
