const things = require('./things.js');

module.exports = {
  /* Remove invoking message */
  removeCallMsg: function (message) {
    message.delete().catch(error => things.log(things.translate("BOT_removeCallMsg_err")));
  },

  /* send reply to same channel */
  MSGReply: function (message, reply_text, additional = null) {
    //message.channel.send(reply_text);
    message.channel.send(reply_text, additional);
  },

  /* Send and remove message in X seconds */
  selfDestructMSG: function (message, MSGText, time, cmd_name) {
    message.channel.send(MSGText).then(sentMessage => {
      sentMessage.delete(time).catch(error => things.log(things.translate("BOT_send_selfdestruct_err")));
    });
    things.log(things.translate("BOT_send_selfdestruct", message.author.username.toString(), cmd_name));
  },

  /* Send and remove message in X seconds (from given channel)*/
  selfDestructMSGID: function (client, channelID, MSGText, time, user = null, cmd_name) {
    client.channels.get(channelID).send(MSGText).then(sentMessage => {
      sentMessage.delete(time).catch(error => things.log(things.translate("BOT_send_selfdestruct_err")));
    });
    things.log(things.translate("BOT_send_selfdestructid", user, cmd_name));
  },

  /* Send to channel with ID */
  sendMSGID: function (client, channelID, MSGText) {
    client.channels.get(channelID).send(MSGText)
    things.log(things.translate("BOT_send_sendMSGID", channelID));
  },

  /* Send message to all servers (guilds) bot is in */
  SendtoAllGuilds: function (client, text, picture = null) {
    try {
      var toSay = text;
      client.guilds.map((guild) => {
        var found = 0;
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
      things.log(things.translate("BOT_send_all"));
    }
    catch (err) {
      things.log(things.translate("BOT_could_not_send"));
    }
  }
}
