const request = require("request");


module.exports = {
    /* basic page check */
    defaultPageCheck: function (url) {
        return new Promise(resolve => {
            request({
                uri: url,
            }, function (error, response, body) {
                if (body === undefined || body === null || response.statusCode != 200) {
                    resolve(false);
                } else {
                    resolve(true);
                }
            });
        });
    },

    /* gogoanime check */
    gogoanime: function (url) {
        return new Promise(resolve => {
            request({
                uri: url,
            }, function (error, response, body) {
                if (body === undefined || body === null) {
                    resolve(false);
                } else {
                    resolve(body.includes('Related episode'));
                }
            });
        });
    }
}
