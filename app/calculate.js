const config = require('../config/config.json'); //file with config
const date = require('date-and-time');
require('date-and-time/plugin/ordinal');
date.plugin('ordinal');
const things = require('./things.js');
const discord = require('./things_discord.js');

var TMPtodayArray = [];
const announceFile = "announce.json";

function fixDubleDigits(number) {
    if (parseInt(number) < 10) {
        return `0${parseInt(number)}`;
    } else {
        return number;
    }
}

module.exports = {

    /* AnimeTimer = put all json data into array for later calculations */
    fillAnimeArray: function (json_obj) {
        var anime_in_array = [];
        for (var i in json_obj) {
            var valueToPush = {};
            if (json_obj[i].hasOwnProperty('year')) {
                valueToPush.name = i;
                valueToPush.year = json_obj[i]["year"];
                valueToPush.month = fixDubleDigits((json_obj[i]["month"]));
                valueToPush.day = fixDubleDigits(json_obj[i]["day"]);
                valueToPush.time = json_obj[i]["time"];
                if (json_obj[i].hasOwnProperty("link")) {
                    valueToPush.link = json_obj[i]["link"];
                    valueToPush.episode = json_obj[i]["_starting_episode"] - json_obj[i]["_skipped_episodes"];
                    valueToPush.last_episode = json_obj[i]["_last_episode"];
                }
                if (json_obj[i].hasOwnProperty("picture")) {
                    valueToPush.picture = json_obj[i]["picture"];
                }
                if (json_obj[i].hasOwnProperty("checkTo")) {
                    valueToPush.checkTo = json_obj[i]["checkTo"];
                }
                anime_in_array.push(valueToPush);
            }
        }
        return anime_in_array;
    },

    /* make string from animes to be posted */
    StringOfAnime: function (AnimeArray, message = null, textoutput = false) {
        var zero_dayHeader = "```fix\nToday:```\n";
        var one_dayHeader = "\n```fix\nOne Day:```\n";
        var two_daysHeader = "\n```fix\nTwo Days:```\n";
        var less_than_weekHeader = "\n```fix\nLess than week:```\n";
        var oth_daysHeader = "\n```fix\nLater:```\n";
        var zero_day = "";
        var one_day = "";
        var two_days = "";
        var less_than_week = "";
        var oth_days = "";

        AnimeArray.forEach(function (item) {
            if (item.hasOwnProperty('year') & item.hasOwnProperty('month') & item.hasOwnProperty('day')) { //check if there is values to be calculated

                var json_date = date.parse(`${item.year}-${item.month}-${item.day}`, 'YYYY-MM-DD');
                var weeks = Math.ceil((date.subtract(new Date(), json_date).toDays()) / 7); //round weeks UP to determine next episode release
                var newep_date = date.addDays(json_date, Math.abs(weeks) * 7); // calculate next ep date from weeks
                var new_ep_in = date.subtract(newep_date, new Date()).toHours(); //new ep in X hours
                var difference = new_ep_in / 24;
                var countDownDate = date.format(newep_date, 'dddd, DDD MMMM').toString(); /* Saturday, 9th*/
                var countDownDate_oth = date.format(newep_date, 'dddd, DDD MMMM').toString(); /* Saturday, 9th April */;
                var episode = parseInt(item.episode) + parseInt(weeks);
                if (episode > item.last_episode) {
                    return; // skip if serie has ended...
                }

                if (episode >= 1) {
                    var cd_text = `**${item.name}**: ${countDownDate} ${item.time} [\`ep${episode}\`]\n`;
                    var cd_text_oth = `**${item.name}**: ${countDownDate_oth} ${item.time} [\`ep${episode}\`]\n`;
                } else {
                    countDownDate = date.format(date.parse(`${item.year}-${item.month}-${item.day}`, 'YYYY-MM-DD'), 'dddd, DDD MMMM').toString();
                    countDownDate_oth = date.format(date.parse(`${item.year}-${item.month}-${item.day}`, 'YYYY-MM-DD'), 'dddd, DDD MMMM').toString();
                    var cd_text = `**${item.name}**: ${countDownDate} \`[in ${episode * -1} week(s)\`]\n`;
                    var cd_text_oth = `**${item.name}**: ${countDownDate_oth} \`[in ${Math.abs(weeks)} week(s)\`]\n`;
                }


                switch (true) {
                    case (difference <= 0): //today
                        zero_day += cd_text;
                        if (item.link) {
                            if (item.checkTo) {
                                things.JSON_file_add_edit_element(announceFile, things.parse(item.checkTo, episode), {
                                    "URL": `${things.parse(item.link, episode)}`,
                                    "IMAGE": `${item.picture}`,
                                    "NAME": `${item.name}`,
                                    "EPS": `${episode}`,
                                });
                            } else {
                                things.JSON_file_add_edit_element(announceFile, things.parse(item.link, episode), {
                                    "URL": `${things.parse(item.link, episode)}`,
                                    "IMAGE": `${item.picture}`,
                                    "NAME": `${item.name}`,
                                    "EPS": `${episode}`,
                                });
                            }
                            things.log(things.translate("upcoming_check", item.name, things.parse(item.link, episode)));
                        }
                        break;
                    case (difference >= 0 && difference <= 1): // tomorrow
                        one_day += cd_text;
                        break;
                    case (difference >= 1 && difference <= 2): //2days
                        two_days += cd_text;
                        break;
                    case (difference >= 2 && difference <= 7): //3-7days
                        less_than_week += cd_text;
                        break;
                    default: //later
                        oth_days += cd_text_oth;
                }
            }
        });

        if (zero_day.length > 1) {
            zero_day = zero_dayHeader + things.sortByDays(zero_day);
        } else {
            zero_day = "";
        }
        if (one_day.length > 1) {
            one_day = one_dayHeader + things.sortByDays(one_day);
        } else {
            one_day = "";
        }
        if (two_days.length > 1) {
            two_days = two_daysHeader + things.sortByDays(two_days);
        } else {
            two_day = "";
        }
        if (less_than_week.length > 1) {
            less_than_week = less_than_weekHeader + things.sortByDays(less_than_week);
        } else {
            less_than_week = "";
        }
        if (oth_days.length > 1) {
            oth_days = oth_daysHeader + things.sortByDays(oth_days);
        } else {
            oth_days = "";
        }

        if (textoutput) {
            if (config.show_more_than_week) {
                discord.selfDestructMSG(message, zero_day + " " + one_day + " " + two_days + " " + less_than_week + " " + oth_days, 30000, "AnimeTable");
            } else {
                discord.selfDestructMSG(message, zero_day + " " + one_day + " " + two_days + " " + less_than_week, 30000, "AnimeTable");
            }
        }
    }
}
